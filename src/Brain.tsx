import { clamp, mean, range } from "lodash";
import { Neat, methods } from "neataptic";

export class Brain {
  neat: Neat;
  speed: number = 0;
  iterations: number = 11;
  fittest = { model: undefined, score: 0 };
  constructor(
    public run: (
      mutator: (input: number[]) => number,
      speed: number
    ) => Promise<number>,
    public report: (obj: {
      fitness?: number;
      generation?: number;
      currentFitness?: number;
    }) => void
  ) {
    this.neat = new Neat(2, 1, undefined, {
      mutation: methods.mutation.ALL,
      elitism: 0.1,
      equal: true,
    });
  }

  async startEvaluation() {
    for (const g in this.neat.population) {
      const genome = this.neat.population[g];
      const scores = [];
      for (const _ of range(this.iterations)) {
        scores.push(
          await this.run((dataset) => genome.activate(dataset), this.speed)
        );
      }
      genome.score = mean(scores);
      if (genome.score > this.fittest.score) {
        this.fittest = {
          model: genome,
          score: genome.score,
        };
      }
      this.report({ currentFitness: genome.score });
    }
  }

  endEvaluation() {
    console.log(
      "Generation:",
      this.neat.generation,
      "- average score:",
      this.neat.getAverage()
    );

    this.report({
      fitness: this.neat.getAverage(),
      generation: this.neat.generation,
    });

    this.neat.sort();
    let newPopulation = [];

    // Elitism
    for (let i = 0; i < this.neat.elitism; i++) {
      newPopulation.push(this.neat.population[i]);
    }

    // Breed the next individuals
    for (let i = 0; i < this.neat.popsize - this.neat.elitism; i++) {
      newPopulation.push(this.neat.getOffspring());
    }

    // Replace the old population with the new population
    this.neat.population = newPopulation;
    this.neat.mutate();
  }

  evolve() {
    this.neat.generation++;
  }

  async train() {
    for (let i = 0; i < 100; i += 1) {
      await this.startEvaluation();
      this.endEvaluation();
      this.evolve();
    }
  }

  calculateFitness(input: number[], output: number) {
    return 1;
  }
}
