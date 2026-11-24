import { useCallback, useRef, useState } from 'react';
import { FilmOverlays } from './components/FilmOverlays';
import { MenuSections } from './components/MenuSections';
import { ChaiStage, StageController } from './three/ChaiStage';

export default function App() {
  const [activeTeaIndex, setActiveTeaIndex] = useState(0);
  const [teaChangeDir, setTeaChangeDir] = useState(1);
  const [storyStepIndex, setStoryStepIndex] = useState(0);

  const heroOverlayRef = useRef<HTMLDivElement | null>(null);
  const storyOverlayRef = useRef<HTMLDivElement | null>(null);
  const navOverlayRef = useRef<HTMLElement | null>(null);
  const controllerRef = useRef<StageController | null>(null);

  const handleCenterTeaChange = useCallback((teaIndex: number, direction: number) => {
    setTeaChangeDir(direction);
    setActiveTeaIndex(teaIndex);
  }, []);

  const handleStoryStepChange = useCallback((stepIndex: number) => {
    setStoryStepIndex(stepIndex);
  }, []);

  return (
    <>
      <ChaiStage
        navOverlayRef={navOverlayRef}
        heroOverlayRef={heroOverlayRef}
        storyOverlayRef={storyOverlayRef}
        onCenterTeaChange={handleCenterTeaChange}
        onStoryStepChange={handleStoryStepChange}
        controllerRef={controllerRef}
      />

      <FilmOverlays
        activeTeaIndex={activeTeaIndex}
        teaChangeDir={teaChangeDir}
        storyStepIndex={storyStepIndex}
        navOverlayRef={navOverlayRef}
        heroOverlayRef={heroOverlayRef}
        storyOverlayRef={storyOverlayRef}
        controllerRef={controllerRef}
      />

      <div id="track" aria-hidden="true" />

      <MenuSections />
    </>
  );
}
