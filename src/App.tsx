import {
  Box,
  CssBaseline,
  Paper,
  Tab,
  Tabs,
  useTheme,
} from "@material-ui/core";
import { useState } from "react";
import "./App.css";
import Inspector from "./Inspector";
import Simulation from "./Simulation";

function App() {
  const theme = useTheme();
  const [tab, setTab] = useState("train");
  return (
    <CssBaseline>
      <Box height="100vh" display="flex">
        <Box
          bgcolor={theme.palette.background.paper}
          pt={2}
          borderRight={`1px solid ${theme.palette.divider}`}
        >
          <Tabs
            value={tab}
            indicatorColor="primary"
            textColor="primary"
            onChange={(_, v) => setTab(v)}
            orientation="vertical"
          >
            <Tab label="Train" value="train" />
            <Tab label="Inspect" value="inspect" />
          </Tabs>
        </Box>
        <Box flex={1}>
          {tab === "train" && <Simulation />}
          {tab === "inspect" && <Inspector />}
        </Box>
      </Box>
    </CssBaseline>
  );
}

export default App;
