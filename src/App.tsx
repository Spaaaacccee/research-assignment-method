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
import Simulation from "./Simulation";

function App() {
  const theme = useTheme();
  const [tab, setTab] = useState("train");
  return (
    <CssBaseline>
      <Box height="100vh" display="flex">
        <Box bgcolor={theme.palette.background.paper} pt={3}>
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
        <Box flex={1}>{tab === "train" && <Simulation />}</Box>
      </Box>
    </CssBaseline>
  );
}

export default App;
