import React, { useEffect, useReducer, useRef, useState } from "react";
import {
  defer,
  entries,
  every,
  flatMap,
  flatten,
  keys,
  mean,
  noop,
  random,
  round,
  sum,
} from "lodash";
import dataset from "method-data/dataset.json";
import { Brain } from "./Brain";
import { Simulator, MAX_COUNT, pad, HISTORY_STEPS, sign } from "./Simulator";
import {
  Box,
  Button,
  ButtonGroup,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from "@material-ui/core";
import download from "downloadjs";
import fileDialog from "file-dialog";
import { Network } from "neataptic";
import { drawGraph } from "./graph";
import { createInputArray } from "./createInputArray";

const INSPECT_DOCS_URL =
  "https://github.com/Spaaaacccee/research-assignment-method/blob/master/docs/inspect.md";

const codes = entries(dataset.posts)
  .slice(50, 100)
  .filter(([_, posts]) => !every(posts.day, (p) => !p.posts.length))
  .map(([code]) => code);

type Key = keyof typeof dataset["prices"];

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

export default function Inspector() {
  const theme = useTheme();
  const [ref, setRef] = useState<SVGElement | null>(null);
  const [model, setModel] = useState<any>(undefined);
  const [info, setInfo] = useReducer(
    (prev: SimulationInfo, next: SimulationInfo) => ({ ...prev, ...next }),
    { fitness: 0, generation: 0 }
  );
  const brainRef = useRef<Brain | undefined>(undefined);
  const simulatorRef = useRef<Simulator | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [log, addLog] = useReducer(
    (prev: string[], action: string) => lastFew([...prev, action], 100),
    ["Import a model to get started"]
  );
  useEffect(() => {
    if (model && ref) {
      try {
        const network = Network.fromJSON(model);
        defer(() => drawGraph(network.graph(3200, 800), `#${ref.id}`));
        addLog("Model loaded");
      } catch (e) {
        addLog("Couldn't load the model");
      }
    }
  }, [model, ref]);
  return (
    <Box display="flex" height="100%">
      <Box
        bgcolor={theme.palette.background.paper}
        width={300}
        pl={2}
        display="flex"
        flexDirection="column"
      >
        <Box p={2} pt={3}>
          <Typography display="block" variant="h6" gutterBottom>
            Inspect
          </Typography>
          <Typography
            display="block"
            variant="caption"
            color="textSecondary"
            gutterBottom
          >
            This page provides tools inspect a trained model and measure its
            effectiveness.
            <br />
            <Link href={INSPECT_DOCS_URL} target="_blank" rel="noopener">
              More
            </Link>
          </Typography>
        </Box>
        <Box p={2} pr={4}>
          <Typography display="block" variant="overline" gutterBottom>
            Actions
          </Typography>
          <Box pb={1}>
            <Box mb={1}>
              <Button
                disabled={loading}
                onClick={async () => {
                  try {
                    const files = await fileDialog({
                      accept: "application/json",
                    });
                    if (files?.[0]) {
                      const text = await files?.[0].text();
                      setModel(JSON.parse(text));
                    }
                  } catch {
                    addLog("Couldn't read the file");
                  }
                }}
                variant="outlined"
              >
                Import model
              </Button>
            </Box>
            <Box>
              <Button
                disabled={!model || loading}
                variant="outlined"
                onClick={async () => {
                  const allOutput: { code: string; results: number[] }[] = [];
                  const network = Network.fromJSON(model);
                  setLoading(true);
                  for (const code of codes) {
                    await new Promise<void>((res) => {
                      const simulator = new Simulator(
                        code,
                        {
                          company: dataset.prices[code as Key],
                          posts: dataset.posts[code as Key],
                        },
                        (a, b, c) => {
                          const input = createInputArray(a, b, c);
                          const output = network.activate(input);
                          // Remap to -1..1
                          return output * 2 - 1;
                        },
                        true,
                        () => {
                          allOutput.push({ code, results: simulator.results });
                          addLog(
                            `${code}.AX: ${sum(simulator.results)}/${
                              simulator.results.length
                            }`
                          );
                          res();
                        }
                      );
                      simulator.run();
                    });
                  }
                  console.log(allOutput);
                  const avg = mean(flatten(allOutput.map((c) => c.results)));
                  addLog(`Model has ${(avg * 100).toFixed(2)}% accuracy`);
                  setLoading(false);
                }}
              >
                {loading ? "Running" : "Evaluate Model"}
              </Button>
            </Box>
          </Box>
        </Box>
        <Box
          p={2}
          flex={1}
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <Typography display="block" variant="overline" gutterBottom>
            Log
          </Typography>
          <Box overflow="auto" flex={1} m={-2} p={2} mt={0} pt={0}>
            {log.map((l) => (
              <div>
                <code>{l}</code>
              </div>
            ))}
          </Box>
        </Box>
      </Box>
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor={theme.palette.background.default}
        overflow="auto"
        height="100%"
      >
        <svg ref={(e) => setRef(e)} id="graph" width="100%" height="100%"></svg>
      </Box>
    </Box>
  );
}
