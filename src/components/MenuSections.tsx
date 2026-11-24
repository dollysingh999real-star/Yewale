import React, { useState } from 'react';
import {
  MENU_TABS,
  MenuCategoryId,
  OUTLET_CITIES,
  SIGNATURES_SPOTLIGHT,
} from '../data/yewale';

export const MenuSections: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MenuCategoryId>('teas');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const currentTab = MENU_TABS.find((t) => t.id === activeTab) || MENU_TABS[0];

  return (
    <main id="menu-sections">
      {/* THE MENU */}
      <section id="the-menu" className="mx-auto max-w-[1160px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="border-b border-[#D7261E] pb-5">
          <h2
            className="font-[var(--disp)] font-black italic uppercase tracking-tight text-[#2B1A12]"
            style={{ fontSize: 'clamp(44px, 5vw, 64px)', lineHeight: 0.95 }}
          >
            THE MENU
          </h2>
          <p className="mt-3 text-base font-medium text-[#2B1A12]/80 sm:text-lg">
            Every price, right here. No guessing.
          </p>
        </div>

        {/* Four Category Tabs */}
        <div
          role="tablist"
          aria-label="Menu categories"
          className="mt-8 flex items-center gap-6 overflow-x-auto border-b border-[#D7261E]/25 pb-0.5"
        >
          {MENU_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative whitespace-nowrap shrink-0 pb-3.5 text-sm font-bold tracking-wide transition-colors sm:text-base cursor-pointer ${
                  isActive
                    ? 'text-[#D7261E]'
                    : 'text-[#2B1A12]/65 hover:text-[#2B1A12]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 bottom-0 left-0 h-[2.5px] bg-[#D7261E]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Two-column Item Grid (1-col on <=820px) */}
        <div
          key={currentTab.id}
          role="tabpanel"
          aria-label={currentTab.label}
          className="menu-fade-enter mt-10 grid grid-cols-1 gap-x-14 gap-y-5 md:grid-cols-2"
        >
          {currentTab.items.map((item) => (
            <div
              key={item.name}
              className="flex items-baseline gap-3 py-1"
            >
              <span className="shrink-0 text-[18px] font-bold text-[#2B1A12] sm:text-[20px]">
                {item.name}
              </span>
              {item.signature && (
                <span className="shrink-0 rounded bg-[#FFC61A] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-[#2B1A12] uppercase">
                  SIGNATURE
                </span>
              )}
              <span
                aria-hidden="true"
                className="min-w-[16px] flex-1 border-b border-dotted border-[#2B1A12]/35"
              />
              <span className="shrink-0 font-[var(--disp)] text-[26px] font-black italic tabular-nums text-[#D7261E] sm:text-[28px]">
                {item.price}
              </span>
            </div>
          ))}
        </div>

        {/* Variance Note & Three Badges */}
        <div className="mt-12 flex flex-col gap-4 border-t border-[#D7261E]/25 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-normal text-[#2B1A12]/75">
            Prices as listed at Pune outlets — confirm at your nearest outlet.
          </p>
          <p className="text-xs font-bold tracking-[0.08em] uppercase text-[#D7261E]">
            100% Vegetarian <span aria-hidden="true">·</span> No Preservatives{' '}
            <span aria-hidden="true">·</span> Standardized Recipe
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <hr className="border-t border-[#D7261E]/40" />
      </div>

      {/* SIGNATURES SPOTLIGHT */}
      <section className="mx-auto max-w-[1160px] px-5 py-16 sm:px-8 sm:py-20">
        <h2
          className="font-[var(--disp)] font-black italic uppercase tracking-tight text-[#2B1A12]"
          style={{ fontSize: 'clamp(38px, 4.4vw, 56px)', lineHeight: 0.95 }}
        >
          SIGNATURES SPOTLIGHT
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {SIGNATURES_SPOTLIGHT.map((sig) => (
            <article key={sig.name} className="group">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#2B1A12]/10">
                {!imgErrors[sig.name] ? (
                  <img
                    src={sig.image}
                    alt={sig.alt}
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((prev) => ({ ...prev, [sig.name]: true }))}
                    className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F6C89F] to-[#E8604A] p-6 text-center">
                    <span className="font-[var(--disp)] text-2xl font-black italic uppercase text-[#FFF6E8]">
                      {sig.name}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="mt-4 font-[var(--disp)] text-[30px] font-black italic uppercase leading-none text-[#D7261E]">
                {sig.name}
              </h3>
              <p className="mt-1.5 text-[15px] font-medium text-[#2B1A12]/80">
                {sig.caption}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <hr className="border-t border-[#D7261E]/40" />
      </div>

      {/* OUR STORY */}
      <section className="mx-auto max-w-[1160px] px-5 py-16 sm:px-8 sm:py-20">
        <h2
          className="font-[var(--disp)] font-black italic uppercase tracking-tight text-[#2B1A12]"
          style={{ fontSize: 'clamp(38px, 4.4vw, 56px)', lineHeight: 0.95 }}
        >
          OUR STORY
        </h2>

        <p className="mt-6 max-w-3xl text-lg font-semibold text-[#2B1A12] sm:text-xl">
          From a humble tea stall in Pune (1983) to 650+ outlets in 13 states.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold tracking-[0.14em] uppercase text-[#D7261E]">
              Vision
            </h3>
            <p className="mt-2 text-base leading-relaxed text-[#2B1A12]/85">
              To build a prosperous, satisfied, unemployment-free world.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-[0.14em] uppercase text-[#D7261E]">
              Mission
            </h3>
            <p className="mt-2 text-base leading-relaxed text-[#2B1A12]/85">
              To innovate taste and experiences in beverages &amp; food that satisfy the soul and
              are affordable and accessible to all.
            </p>
          </div>
        </div>

        <p className="mt-8 border-t border-[#D7261E]/20 pt-5 text-sm font-semibold text-[#2B1A12]/85 sm:text-base">
          A family business — Navnath Yewale (Managing Director), Nilesh Yewale (Director), Ganesh
          Yewale (Director).
        </p>
      </section>

      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <hr className="border-t border-[#D7261E]/40" />
      </div>

      {/* FIND AN OUTLET */}
      <section className="mx-auto max-w-[1160px] px-5 py-16 sm:px-8 sm:py-20">
        <h2
          className="font-[var(--disp)] font-black italic uppercase tracking-tight text-[#2B1A12]"
          style={{ fontSize: 'clamp(38px, 4.4vw, 56px)', lineHeight: 0.95 }}
        >
          FIND AN OUTLET
        </h2>

        <p className="mt-4 text-lg font-medium text-[#2B1A12]/85">
          Brewing across India — 650+ outlets in 13 states.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {OUTLET_CITIES.map((city) => (
            <span
              key={city}
              className="rounded-full border border-[#D7261E] px-4 py-1.5 text-sm font-semibold text-[#2B1A12]"
            >
              {city}
            </span>
          ))}
          <span className="px-2 text-sm font-medium text-[#2B1A12]/70">and 20 more</span>
        </div>

        <p className="mt-5 text-sm font-semibold text-[#D7261E]">Find your nearest outlet</p>
      </section>

      <div className="mx-auto max-w-[1160px] px-5 sm:px-8">
        <hr className="border-t border-[#D7261E]/40" />
      </div>

      {/* CONTACT */}
      <section className="mx-auto max-w-[1160px] px-5 py-16 sm:px-8 sm:py-20">
        <h2
          className="font-[var(--disp)] font-black italic uppercase tracking-tight text-[#2B1A12]"
          style={{ fontSize: 'clamp(38px, 4.4vw, 56px)', lineHeight: 0.95 }}
        >
          CONTACT
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-6 text-base text-[#2B1A12]/85 md:grid-cols-3">
          <div>
            <div className="text-xs font-bold tracking-[0.14em] uppercase text-[#D7261E]">
              Corporate Office
            </div>
            <p className="mt-1.5 font-medium text-[#2B1A12]">
              DNK Capital, Office No. 701, Kondhwa Bk., Pune 411048
            </p>
          </div>
          <div>
            <div className="text-xs font-bold tracking-[0.14em] uppercase text-[#D7261E]">
              Phone
            </div>
            <p className="mt-1.5">
              <a
                href="tel:+918181800800"
                className="font-semibold text-[#2B1A12] underline decoration-[#D7261E]/50 underline-offset-4 transition-colors hover:text-[#D7261E]"
              >
                +91 8181 800 800
              </a>
            </p>
          </div>
          <div>
            <div className="text-xs font-bold tracking-[0.14em] uppercase text-[#D7261E]">
              Email
            </div>
            <p className="mt-1.5">
              <a
                href="mailto:info@yewale.com"
                className="font-semibold text-[#2B1A12] underline decoration-[#D7261E]/50 underline-offset-4 transition-colors hover:text-[#D7261E]"
              >
                info@yewale.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#2B1A12] text-[#FFF6E8]">
        <div className="mx-auto flex max-w-[1160px] flex-col items-start justify-between gap-4 px-5 py-12 sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-baseline gap-3">
            <span className="font-[var(--deva)] text-2xl font-bold text-[#FFF6E8]">येवले</span>
            <span className="font-[var(--disp)] text-2xl font-black italic tracking-tight text-[#FFF6E8]">
              YEWALE AMRUTTULYA
            </span>
            <span className="text-sm text-[#FFF6E8]/70">· Since 1983</span>
          </div>
          <p className="text-sm text-[#FFF6E8]/80">
            Preview — built for Yewale Amruttulya by Divyansh Khandal.
          </p>
        </div>
      </footer>
    </main>
  );
};
