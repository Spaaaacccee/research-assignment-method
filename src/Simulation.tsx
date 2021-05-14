import React, { useEffect, useReducer, useRef, useState } from "react";
import {
  entries,
  every,
  flatMap,
  keys,
  mean,
  noop,
  random,
  round,
} from "lodash";
import dataset from "method-data/dataset.json";
import { Brain } from "./Brain";
import { Simulator, MAX_COUNT, pad, HISTORY_STEPS, sign } from "./Simulator";
import {
  Box,
  Button,
  ButtonGroup,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from "@material-ui/core";

const codes = entries(dataset.posts)
  .filter(([_, posts]) => !every(posts.day, (p) => !p.posts.length))
  .map(([code]) => code);

function randItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function lastFew<T>(arr: T[], n: number) {
  return arr.slice(Math.max(arr.length - n, 0));
}

type SimulationInfo = {
  currentFitness?: number;
  fitness?: number;
  generation?: number;
  currentCompany?: string;
  currentPrice?: string;
  currentDelta?: string;
};

export default function Simulation() {
  const theme = useTheme();
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [info, setInfo] = useReducer(
    (prev: SimulationInfo, next: SimulationInfo) => ({ ...prev, ...next }),
    { fitness: 0, generation: 0 }
  );
  const [speed, setSpeed] = useState(0);
  const [log, addLog] = useReducer(
    (prev: string[], action: string) => lastFew([...prev, action], 100),
    ["Simulation started"]
  );
  const brainRef = useRef<Brain | undefined>(undefined);
  const simulatorRef = useRef<Simulator | undefined>(undefined);
  useEffect(() => {
    if (ref) {
      const brain = new Brain(
        (mutator, speed) => {
          return new Promise((res) => {
            ref.innerHTML = "";
            const code = randItem(codes);
            // addLog(`Simulating ${code}`);
            setInfo({ currentCompany: code });
            const simulator = new Simulator(
              code,
              {
                company: dataset.prices[code as keyof typeof dataset["prices"]],
                posts: dataset.posts[code as keyof typeof dataset["prices"]],
              },
              (investor, company, vision) => {
                // Encode information into array of 0..1 floats
                const input: number[] = [
                  // Self info
                  investor.cookies / MAX_COUNT,
                  investor.cookiesInvested / MAX_COUNT,
                  // Company info
                  ...pad(
                    company.values.map((c) => (c?.change ?? 0 + 1) * 0.5),
                    HISTORY_STEPS
                  ),
                  // Vision info
                  ...pad(
                    flatMap(lastFew(vision.investors, 3), (i) => [
                      ...pad(
                        i.posts.map((p) => p.favoriteCount / MAX_COUNT),
                        HISTORY_STEPS
                      ),
                      ...pad(
                        i.posts.map((p) => p.retweetCount / MAX_COUNT),
                        HISTORY_STEPS
                      ),
                      ...pad(
                        i.posts.map((p) => sign(p.textSentiment) / MAX_COUNT),
                        HISTORY_STEPS
                      ),
                    ]),
                    HISTORY_STEPS * 3
                  ),
                ];
                // Returns 0..1
                const out = mutator(input);
                // Remap to -1..1
                return out * 2 - 1;
              },
              true,
              () => {
                const results = mean(simulator.results);
                res(results);
              },
              (msg) => addLog(msg)
            );
            simulator.speed = speed;
            simulator.renderer.mount(ref);
            simulator.run();
            simulatorRef.current = simulator;
          });
        },
        ({ fitness, generation, currentFitness }) => {
          if (generation !== undefined) {
            addLog(
              `Generation ${generation}: ${((fitness ?? 0) * 100).toFixed(
                2
              )}% accurate`
            );
          }
          if (fitness) {
            setInfo({ fitness });
          }
          if (generation) {
            setInfo({ generation });
          }
          if (currentFitness) {
            setInfo({ currentFitness });
          }
        }
      );

      brain.train();
      brainRef.current = brain;
      return () => (ref.innerHTML = "");
    }
    return noop;
  }, [ref, setInfo, brainRef, simulatorRef, addLog]);
  useEffect(() => {
    if (brainRef.current && simulatorRef.current) {
      const brain = brainRef.current;
      const simulator = simulatorRef.current;
      brain.speed = speed;
      simulator.speed = speed;
    }
  }, [brainRef, simulatorRef, speed]);
  return (
    <Box display="flex" height="100vh">
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor={theme.palette.background.default}
        overflow="auto"
        height="100vh"
      >
        <div ref={(e) => setRef(e)}></div>
      </Box>
      <Box bgcolor={theme.palette.background.paper} pl={2} pr={1}>
        <List>
          <ListItem>
            <ListItemText
              primary={info.generation ?? 0}
              secondary="Generation"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={
                info.fitness ? `${(info.fitness * 100).toFixed(2)}%` : "-"
              }
              secondary="Fitness"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={
                info.currentFitness
                  ? `${(info.currentFitness * 100).toFixed(2)}%`
                  : "-"
              }
              secondary="Current Fitness"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={`${info.currentCompany}.AX` ?? "-"}
              secondary="Company"
            />
          </ListItem>
        </List>
      </Box>
      <Box bgcolor={theme.palette.background.paper} width={300}>
        <Box p={2}>
          <Typography display="block" variant="overline" gutterBottom>
            Speed
          </Typography>
          <ButtonGroup
            // color="primary"
            aria-label="outlined primary button group"
          >
            <Button onClick={() => setSpeed(0)} disabled={speed === 0}>
              1.0x
            </Button>
            <Button onClick={() => setSpeed(100)} disabled={speed === 100}>
              0.5x
            </Button>
            <Button onClick={() => setSpeed(1000)} disabled={speed === 1000}>
              0.1x
            </Button>
          </ButtonGroup>
        </Box>
        <Box p={2} pr={4}>
          <Typography display="block" variant="overline" gutterBottom>
            Actions
          </Typography>
          <Box pb={1}>
            <Button
              disabled={(info.generation ?? 0) < 1}
              onClick={() => {
                if (brainRef.current) {
                  const brain = brainRef.current;
                  if (brain.fittest.model) {
                    prompt(
                      `Here's the fittest genome with a score of ${brain.fittest.score.toFixed(
                        2
                      )}:`,
                      JSON.stringify((brain?.fittest?.model as any).toJSON())
                    );
                  }
                }
              }}
              variant="outlined"
            >
              Export fittest
            </Button>
          </Box>
          <Typography variant="caption" color="textSecondary" display="block">
            Exporting the fittest genome is available after generation 1
          </Typography>
        </Box>
        <Box p={2}>
          <Typography display="block" variant="overline" gutterBottom>
            Log
          </Typography>
          {log.map((l) => (
            <div>
              <code>{l}</code>
            </div>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
