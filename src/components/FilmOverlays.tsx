import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Coffee, Leaf, Sun, UtensilsCrossed, X } from 'lucide-react';
import { STORY_STEPS, TEAS } from '../data/yewale';
import { scrambleTitleText } from '../lib/choreography';
import { StageController } from '../three/ChaiStage';

interface FilmOverlaysProps {
  activeTeaIndex: number;
  teaChangeDir: number;
  storyStepIndex: number;
  navOverlayRef: React.RefObject<HTMLElement | null>;
  heroOverlayRef: React.RefObject<HTMLDivElement | null>;
  storyOverlayRef: React.RefObject<HTMLDivElement | null>;
  controllerRef: React.MutableRefObject<StageController | null>;
}

export const FilmOverlays: React.FC<FilmOverlaysProps> = ({
  activeTeaIndex,
  teaChangeDir,
  storyStepIndex,
  navOverlayRef,
  heroOverlayRef,
  storyOverlayRef,
  controllerRef,
}) => {
  const currentTea = TEAS[activeTeaIndex] || TEAS[0];
  const [prevTeaIndex, setPrevTeaIndex] = useState<number | null>(null);
  const [rollKey, setRollKey] = useState(0);
  const lastTeaRef = useRef(activeTeaIndex);

  useEffect(() => {
    if (activeTeaIndex !== lastTeaRef.current) {
      setPrevTeaIndex(lastTeaRef.current);
      lastTeaRef.current = activeTeaIndex;
      setRollKey((k) => k + 1);
      const t = window.setTimeout(() => setPrevTeaIndex(null), 650);
      return () => window.clearTimeout(t);
    }
  }, [activeTeaIndex]);

  // Story decode scramble reveal
  const stepData = STORY_STEPS[storyStepIndex] || STORY_STEPS[0];
  const [displayedTitle, setDisplayedTitle] = useState(stepData.title);
  const [showBars, setShowBars] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const lastStepRef = useRef(storyStepIndex);

  useEffect(() => {
    if (storyStepIndex === lastStepRef.current) return;
    lastStepRef.current = storyStepIndex;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setDisplayedTitle(stepData.title);
      setShowBars(false);
      setIsBlurred(false);
      return;
    }

    setIsBlurred(true);
    setShowBars(true);

    let rafId = 0;
    let bodyTimer = 0;

    const barsTimer = window.setTimeout(() => {
      setShowBars(false);
      const start = performance.now();
      let tickCount = 0;
      const decodeLoop = (now: number) => {
        const p = Math.min(1, (now - start) / 520);
        tickCount += 1;
        setDisplayedTitle(scrambleTitleText(stepData.title, p, tickCount));
        if (p < 1) {
          rafId = requestAnimationFrame(decodeLoop);
        }
      };
      rafId = requestAnimationFrame(decodeLoop);

      bodyTimer = window.setTimeout(() => {
        setIsBlurred(false);
      }, 160);
    }, 230);

    return () => {
      window.clearTimeout(barsTimer);
      window.clearTimeout(bodyTimer);
      cancelAnimationFrame(rafId);
    };
  }, [storyStepIndex, stepData.title]);

  const prevTea = prevTeaIndex !== null ? TEAS[prevTeaIndex] : null;
  const enterClass = teaChangeDir >= 0 ? 'roll-enter-up' : 'roll-enter-down';
  const exitClass = teaChangeDir >= 0 ? 'roll-exit-up' : 'roll-exit-down';

  const jumpTo = (action: () => void) => {
    setNavDrawerOpen(false);
    action();
  };

  return (
    <>
      <header className="nav" ref={navOverlayRef}>
        <a
          href="#top"
          className="nav-logo"
          onClick={(e) => {
            e.preventDefault();
            controllerRef.current?.scrollToPhaseTop(0);
          }}
        >
          <span className="deva">येवले</span>
          <span className="latin">YEWALE</span>
        </a>

        <div className="nav-right">
          <button
            type="button"
            className="nav-menu-btn"
            aria-label="Open navigation menu"
            aria-expanded={navDrawerOpen}
            onClick={() => setNavDrawerOpen((o) => !o)}
          >
            <span className="nav-menu-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="nav-menu-word">MENU</span>
          </button>

          <button
            type="button"
            className="nav-see-menu"
            onClick={() => controllerRef.current?.scrollToMenu()}
          >
            SEE MENU
          </button>
        </div>
      </header>

      {navDrawerOpen && (
        <div
          role="dialog"
          aria-label="Site navigation"
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#2B1A12]/95 px-6 text-[#FFF6E8]"
        >
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setNavDrawerOpen(false)}
            className="absolute top-6 right-8 flex h-11 w-11 items-center justify-center rounded-full border border-[#FFF6E8]/40 text-[#FFF6E8] transition-colors hover:bg-[#FFF6E8] hover:text-[#2B1A12]"
          >
            <X size={20} />
          </button>

          <nav className="flex flex-col items-center gap-4 text-center">
            <button
              type="button"
              onClick={() => jumpTo(() => controllerRef.current?.scrollToPhaseTop(0))}
              className="font-[var(--disp)] text-5xl font-black italic uppercase tracking-tight transition-colors hover:text-[#FFC61A]"
            >
              Cutting Chai Carousel
            </button>
            <button
              type="button"
              onClick={() => jumpTo(() => controllerRef.current?.scrollToStoryStep(0))}
              className="font-[var(--disp)] text-5xl font-black italic uppercase tracking-tight transition-colors hover:text-[#FFC61A]"
            >
              Our Standard
            </button>
            <button
              type="button"
              onClick={() => jumpTo(() => controllerRef.current?.scrollToPhaseTop(4.4))}
              className="font-[var(--disp)] text-5xl font-black italic uppercase tracking-tight transition-colors hover:text-[#FFC61A]"
            >
              Brewed Slow
            </button>
            <button
              type="button"
              onClick={() => jumpTo(() => controllerRef.current?.scrollToMenu())}
              className="font-[var(--disp)] text-5xl font-black italic uppercase tracking-tight text-[#FFC61A] transition-colors hover:text-[#FFF6E8]"
            >
              The Menu &amp; Prices
            </button>
          </nav>
        </div>
      )}

      {/* Hero Overlay */}
      <div id="hero" ref={heroOverlayRef} aria-live="polite">
        <div className="hero-heading-wrap">
          <h1 className="title" data-testid="hero-tea-title">
            <span className="roll-slot" key={`t-${rollKey}`}>
              {prevTea && (
                <span className={`roll-item ${exitClass}`} aria-hidden="true">
                  {prevTea.name}
                </span>
              )}
              <span className={`roll-item ${prevTea ? enterClass : ''}`}>{currentTea.name}</span>
            </span>
          </h1>
          <div className="price-wrap" data-testid="hero-tea-price">
            <span className="roll-slot" key={`p-${rollKey}`}>
              {prevTea && (
                <span className={`roll-item ${exitClass}`} aria-hidden="true">
                  {prevTea.price}
                </span>
              )}
              <span className={`roll-item ${prevTea ? enterClass : ''}`}>{currentTea.price}</span>
            </span>
          </div>
        </div>

        <div className="hero-arrows">
          <button
            type="button"
            className="hero-arrow-btn"
            aria-label="Previous tea"
            onClick={() => controllerRef.current?.stepCarousel(-1)}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="hero-arrow-btn"
            aria-label="Next tea"
            onClick={() => controllerRef.current?.stepCarousel(1)}
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="strip" aria-hidden="true" />
      </div>

      {/* Story Overlay */}
      <div id="story" ref={storyOverlayRef} style={{ opacity: 0, visibility: 'hidden' }}>
        <div className="story-icons">
          <button
            type="button"
            className={`story-icon-btn ${storyStepIndex === 0 ? 'is-active' : ''}`}
            aria-label="Step 1: Standardized Recipe"
            onClick={() => controllerRef.current?.scrollToStoryStep(0)}
          >
            <Coffee size={24} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={`story-icon-btn ${storyStepIndex === 1 ? 'is-active' : ''}`}
            aria-label="Step 2: No Preservatives"
            onClick={() => controllerRef.current?.scrollToStoryStep(1)}
          >
            <Leaf size={24} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={`story-icon-btn ${storyStepIndex === 2 ? 'is-active' : ''}`}
            aria-label="Step 3: 100% Vegetarian"
            onClick={() => controllerRef.current?.scrollToStoryStep(2)}
          >
            <Sun size={24} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="story-icon-btn"
            aria-label="Jump to The Menu"
            onClick={() => controllerRef.current?.scrollToMenu()}
          >
            <UtensilsCrossed size={24} strokeWidth={1.8} />
          </button>
        </div>

        <div className="story-copy">
          <div className={`story-tag-row ${isBlurred ? 'is-blur' : ''}`}>
            <span className="story-tag-sq" aria-hidden="true" />
            <span className="story-tag-text">{stepData.tag}</span>
          </div>

          <h2 className="stitle" data-testid="story-step-title">
            <span className={`stitle-bars ${showBars ? 'is-visible' : ''}`} aria-hidden="true">
              <span className="stitle-bar w80" />
              <span className="stitle-bar w56" />
            </span>
            <span style={{ opacity: showBars ? 0 : 1 }}>{displayedTitle}</span>
          </h2>

          <p className={`story-body ${isBlurred ? 'is-blur' : ''}`}>{stepData.body}</p>
        </div>
      </div>
    </>
  );
};
