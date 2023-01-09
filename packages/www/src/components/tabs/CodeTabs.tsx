import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { genTabId } from "./store";


function isPanelSlotEntry([key]: [string, ComponentChildren]) {
  return key.length === 1 && !isNaN(Number(key));
}

type PanelSlot = `${number}`;

type Props = {
  [key: PanelSlot]: ComponentChildren;
  tabs: string[];
  noTopMargin?: boolean
};

export default function CodeTabs({ tabs, noTopMargin, ...slots }: Props) {
  const tabId = genTabId();
  const panels = Object.entries(slots).filter(isPanelSlotEntry);

  // const tabButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const [curr, setCurr] = useState(0);

  function updateCurr(index: number, el: HTMLButtonElement | null) {
    setCurr(index);
  }

  return (
    <div className={`tabs-code mb-3 ${noTopMargin ? "" : "mt-3"}`}>
      <div className="tab-header" role="tablist">
        {tabs.map((x, key) => (
          <button key={key}
            id={`${tabId}-${key}`}
            // ref={(el) => (tabButtonRefs.current[key] = el)}
            onClick={() => updateCurr(key, /*tabButtonRefs.current[key]*/ null)}
            aria-selected={curr === key}
            tabIndex={curr === key ? 0 : -1}
            role="tab"
            type="button"
            className="btn btn-sm"
          >
            {x}
          </button>
        ))}
      </div>
      {panels.map(([key, content]) => (
        <div key={key}
          hidden={curr !== Number(key)}
          role="tabpanel"
          aria-labelledby={`${tabId}-${key}`}
          className="tab-panel relative"
        >
          {content}
        </div>
      ))}
    </div>
  );
}
