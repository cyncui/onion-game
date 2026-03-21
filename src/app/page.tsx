import { GateProvider } from "./components/GateProvider";
import { DrawingProvider } from "./components/DrawingProvider";
import ScrollContainer from "./components/ScrollContainer";

export default function Home() {
  return (
    <GateProvider>
      <DrawingProvider>
        <ScrollContainer />
      </DrawingProvider>
    </GateProvider>
  );
}
