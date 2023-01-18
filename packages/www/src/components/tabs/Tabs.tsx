import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import { genTabId, useTabState } from "./store";

const tabSlotKey = "tab." as const;
const panelSlotKey = "panel." as const;

type TabSlot = `${typeof tabSlotKey}${string}`;
type PanelSlot = `${typeof panelSlotKey}${string}`;

function isTabSlotEntry(entry: [string, ComponentChildren]): entry is [TabSlot, ComponentChildren] {
	const [key] = entry;
	return key.startsWith(tabSlotKey);
}

function isPanelSlotEntry(
	entry: [string, ComponentChildren]
): entry is [PanelSlot, ComponentChildren] {
	const [key] = entry;
	return key.startsWith(panelSlotKey);
}

function getBaseKeyFromTab(slot: TabSlot) {
	return slot.replace(new RegExp(`^${tabSlotKey}`), "");
}

function getBaseKeyFromPanel(slot: PanelSlot) {
	return slot.replace(new RegExp(`^${panelSlotKey}`), "");
}

type Props = {
	[key: TabSlot | PanelSlot]: ComponentChildren;
	tabs?: string[]
	initial?: PanelSlot;
	sharedStore?: string;
	className?: string
	noTopMargin?: boolean
	label?: string
};

export default function Tabs({ label, sharedStore, className, initial, tabs: _tabs, noTopMargin, ...slots }: Props) {
	const tabId = genTabId();
	const tabs = _tabs && _tabs.length > 0
		? _tabs.map(x => [`tab.${x.toLowerCase().replaceAll(" ", "-")}`, x] as const)
		: Object.entries(slots).filter(isTabSlotEntry);
	const panels = Object.entries(slots).filter(isPanelSlotEntry);

	const tabButtonRefs = useRef<Record<TabSlot, HTMLButtonElement | null>>({});
	const activeTabIndicatorRef = useRef<HTMLSpanElement | null>(null);

	const initialPanelKey = initial ?? panels[0]?.[0] ?? "";
	const [curr, setCurr] = useTabState(getBaseKeyFromPanel(initialPanelKey), sharedStore);

	function updateCurr(tabSlot: TabSlot, el: HTMLButtonElement | null) {
		setCurr(getBaseKeyFromTab(tabSlot));
	}

	function moveFocus(event: KeyboardEvent) {
		if (event.key === "ArrowLeft") {
			const currIdx = tabs.findIndex(([key]) => getBaseKeyFromTab(key) === curr);
			if (currIdx > 0) {
				const [prevTabKey] = tabs[currIdx - 1];
				updateCurr(prevTabKey, tabButtonRefs.current[prevTabKey]);
				tabButtonRefs.current[prevTabKey]?.focus();
			}
		}
		if (event.key === "ArrowRight") {
			const currIdx = tabs.findIndex(([key]) => getBaseKeyFromTab(key) === curr);
			if (currIdx < tabs.length - 1) {
				const [nextTabKey] = tabs[currIdx + 1];
				updateCurr(nextTabKey, tabButtonRefs.current[nextTabKey]);
				tabButtonRefs.current[nextTabKey]?.focus();
			}
		}
	}

	useLayoutEffect(() => {
		const activeTab = tabButtonRefs?.current[`tab.${curr}`];
		const indicator = activeTabIndicatorRef.current;
		if (indicator && activeTab) {
			const tabBoundingRect = activeTab.getBoundingClientRect();
			const left = activeTab.offsetLeft;
			indicator.style.width = `${tabBoundingRect.width}px`;
			indicator.style.height = `${tabBoundingRect.height}px`;
			indicator.style.transform = `translateX(${left}px)`;
		}
	}, [curr]);


	return (
		<div className={`tab mb-3 ${noTopMargin ? "" : "mt-3"} ${className || ""}`}>
			<div className="tab-header hstack gap-1 mb-2 relative" role="tablist" onKeyDown={moveFocus}>
				{label && <div><span class="text-sm fw-bold me-3">{label}</span></div>}
				<span ref={activeTabIndicatorRef} class="indicator-tab" />
				{tabs.map(([key, content]) => (
					<button key={key}
						id={`${tabId}-${key}`}
						ref={(el) => (tabButtonRefs.current[key] = el)}
						onClick={() => updateCurr(key, tabButtonRefs.current[key])}
						aria-selected={curr === getBaseKeyFromTab(key)}
						tabIndex={curr === getBaseKeyFromTab(key) ? 0 : -1}
						role="tab"
						type="button"
						className="btn btn-sm btn-none"
					>
						{content}
					</button>
				))}
			</div>
			{panels.map(([key, content]) => (
				<div key={key}
					hidden={curr !== getBaseKeyFromPanel(key)}
					role="tabpanel"
					aria-labelledby={`${tabId}-${tabSlotKey}${getBaseKeyFromPanel(key)}`}
					className="relative"
				>
					{content}
				</div>
			))}
		</div>
	);
}
