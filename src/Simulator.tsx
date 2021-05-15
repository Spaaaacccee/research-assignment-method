import {
  Agent,
  Environment,
  CanvasRenderer,
  utils,
  Vector,
  Network,
  LineChartRenderer,
  Histogram,
  KDTree,
  Terrain,
  TableRenderer,
  Heatmap,
  Colors,
} from "flocc";
import {
  assign,
  clamp,
  entries,
  fill,
  last,
  noop,
  range,
  sumBy,
  times,
  values,
} from "lodash";
import type {
  Combined as Dataset,
  Company,
  Investor,
  Posts,
  Vision,
} from "method-data/types";
import Neat from "neataptic";
import interpolate from "color-interpolate";

const { mean, distance, gaussian, random, max } = utils;

export function sign(n: number) {
  return n === 0 ? 0 : n > 0 ? 1 : -1;
}

export function pad<T>(array: T[], n: number) {
  return assign(fill(new Array(n), 0), array);
}

function visible(self: Investor, investor: Investor, threshold: number) {
  if (investor.visibility) {
    const dist = distance(self, investor) / investor.visibility;
    return dist < threshold;
  } else return false;
}

export function lastFew<T>(arr: T[], n: number) {
  return arr.slice(Math.max(arr.length - n, 0));
}

type SetupData = {
  totalInvested: number;
};

/**
 * Must return -1<=x<=1
 */
type Mutator = (
  self: Investor,
  company: Company,
  vision: Vision,
  random: number
) => number;

const WIDTH = 800;
const HEIGHT = 800;

export const MAX_COUNT = 1000;

export const HISTORY_STEPS = 10;

const INVESTOR_COUNT = 30;
const VISION_RADIUS = 0.2;

const SCALE = window.devicePixelRatio;

export class Simulator {
  steps: number = 6;
  currentStep: number = 2;
  environment: Environment;
  renderer: CanvasRenderer;
  company: Agent;
  results: number[] = [];
  investors: Agent[] = [];
  speed: number = 0;
  network: Network;
  constructor(
    public name: string,
    public dataset: { company: Company; posts: Posts },
    public mutate: Mutator,
    public doRestore: boolean,
    public onDone: () => void = noop,
    public log: (log: string) => void = noop
  ) {
    this.environment = new Environment({ torus: true });
    this.renderer = new CanvasRenderer(this.environment, {
      width: WIDTH,
      height: HEIGHT,
      connectionOpacity: 0.1,
    });
    this.network = new Network();
    this.environment.use(this.network);
    {
      const agent = this.makeCompany({
        values: [{ change: 0, value: this.dataset.company.values[0].value }],
      });
      this.company = agent;
      this.environment.addAgent(agent);
      this.network.addAgent(agent);
    }
    {
      times(INVESTOR_COUNT, () => {
        const agent = this.makeInvestor(
          {
            cookies: max([0, gaussian(100, 10)]),
            cookiesInvested: 0,
            posts: [],
            visibility: max([
              0,
              gaussian(mean([WIDTH, HEIGHT]) / 4, WIDTH / 4),
            ]),
            x: gaussian(WIDTH / 2, WIDTH / 8),
            y: gaussian(HEIGHT / 2, HEIGHT / 8),
          },
          mutate,
          VISION_RADIUS
        );
        this.environment.addAgent(agent);
        this.network.addAgent(agent);
        this.network.connect(agent, this.company);
        this.investors.push(agent);
      });
    }
    {
      for (const self of this.investors) {
        const visibleInvestors = this.investors.filter((i) =>
          visible(self.data, i.data, VISION_RADIUS)
        );
        for (const i of visibleInvestors) {
          if (i !== self) {
            this.network.connect(i, self);
          }
        }
      }
    }
    for (const i of range(this.currentStep)) {
      this.currentStep = i;
      this.tick(false);
    }
  }
  makeVision(target: Investor, threshold: number, step: number) {
    return {
      company: this.company.data,
      investors: this.investors
        .map((i) => i.data as Investor)
        .filter((i) => visible(target, i, threshold)),
    };
  }
  makeCompany(data: Company) {
    return new Agent({
      ...data,
      size: 2,
      color: "#00F",
      x: 80,
      y: 80,
    });
  }
  makeInvestor(data: Investor, mutate: Mutator, threshold: number) {
    const investor = new Agent({
      ...data,
      size: 1,
      color: "#000",
      tick: (self: Agent) => {
        const data: Investor = self.data;
        const vision = this.makeVision(data, threshold, this.currentStep);

        const company: Company = this.dataset.company;
        const current = company.values[this.currentStep] ?? {
          value: 0,
          change: 0,
        };
        // Positive indicates buy,
        // Negative indicates sell
        const change =
          mutate(data, this.company.data, vision, 0) * current.value;
        if (change <= data.cookies) {
          data.cookies -= change;
          data.cookiesInvested += change;
        }
        self.set(
          "color",
          sign(change) === 0 ? "yellow" : sign(change) === 1 ? "green" : "red"
        );
        self.set("size", clamp(data.cookies / 50 - 1, 0.1, 1) * (1 * 3));
        self.set(data);
      },
    });
    return investor;
  }
  run() {
    if (this.currentStep < this.steps) {
      this.tick();
      if (this.speed) {
        setTimeout(() => this.run(), this.speed);
      } else {
        requestAnimationFrame(() => this.run());
      }
    } else {
      this.onDone();
    }
  }
  tick(recordResult = true) {
    const setupData = this.setup();
    this.environment.tick();
    // this.renderer.render();
    const ctx = this.renderer.canvas.getContext("2d")!;
    ctx.font = "24px Roboto";
    ctx.fillStyle = "black";
    const postCount = sumBy(
      this.investors,
      (c) => (c.data as Investor).posts.length
    );
    ctx.fillText(
      `DAY ${this.currentStep - 2}, ${this.name}.AX, ${postCount} tweets`,
      20,
      20
    );
    const company = this.company.data as { x: number; y: number };
    const r = this.dataset.company.values[this.currentStep];
    ctx.fillText(
      `${this.name}.AX, ${r.value.toFixed(2)} ${
        r.change ? (r.change > 0 ? "▲" : "▼") : "-"
      }`,
      company.x * SCALE + 4,
      company.y * SCALE - 4
    );

    for (const i of this.investors) {
      const investor = i.data as Investor;
      const tweet = last(investor.posts);
      if (tweet) {
        // ctx.fillRect(0, 0, 100, 100);
        ctx.fillText(
          `${tweet.textSentiment >= 0 ? "😀" : "🙁"} ${tweet.text.substring(
            0,
            15
          )}...`,
          investor.x * SCALE + 4,
          investor.y * SCALE - 4
        );
      }
    }
    if (recordResult) {
      this.results.push(this.teardown(setupData));
    }
    if (this.doRestore) {
      this.restore();
    }
    this.currentStep++;
  }

  setup() {
    const out: SetupData = { totalInvested: this.totalInvested };
    // Set posts
    for (const post of this.dataset.posts.day[this.currentStep].posts) {
      const agent = this.investors[random(0, this.investors.length - 1)];
      const investor = agent.data as Investor;
      investor.posts.push(post);
      investor.posts = lastFew(investor.posts, HISTORY_STEPS);
      agent.set(investor);
    }
    // Set company
    {
      const agent = this.company;
      const company = agent.data as Company;
      company.values.push(this.dataset.company.values[this.currentStep]);
      company.values = lastFew(company.values, HISTORY_STEPS);
      agent.set(company);
    }
    return out;
  }
  teardown(initial: SetupData) {
    const totalInvested = this.totalInvested;
    const actualChange = sign(totalInvested - initial.totalInvested);
    const expectedChange =
      this.dataset.company.values[this.currentStep]?.change ?? 0;
    // if (actualChange === expectedChange) {
    //   this.log(`Step ${this.currentStep + 1}: Correct prediction`);
    // } else {
    //   this.log(`Step ${this.currentStep + 1}: Incorrect prediction`);
    //   if (actualChange < expectedChange) {
    //     this.log("Price expected to rise, but actually fell");
    //   } else {
    //     this.log("Price expected to fall, but actually rose");
    //   }
    // }
    return actualChange === expectedChange ? 1 : 0;
  }
  get totalInvested() {
    let totalInvested = 0;
    for (const agent of this.investors) {
      const investor = agent.data as Investor;
      totalInvested += investor.cookiesInvested;
    }
    return totalInvested;
  }

  restore() {}
}
