import { GateProvider } from "./components/GateProvider";
import { DrawingProvider } from "./components/DrawingProvider";
import ScrollContainer from "./components/ScrollContainer";

// DESIGNED AND DEVELOPED BY CYNTHIA CUI @CYNSONLINE ON TWITTER :)

export default function Home() {
  return (
    <GateProvider>
      <DrawingProvider>
        <ScrollContainer />
      </DrawingProvider>
    </GateProvider>
  );
}
