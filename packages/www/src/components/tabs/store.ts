import { useStore } from "@nanostores/preact";
import { atom, map } from "nanostores";
import { useState } from "preact/hooks";

type TabStore = {
	[key: string]: {
		curr: string;
	};
};

export const tabId = atom<number>(0);
export const tabStore = map<TabStore>({});

export function genTabId() {
	const id = tabId.get();
	tabId.set(id + 1);
	return id;
}

export function useTabState(initialCurr: string, storeKey?: string): [string, (curr: string) => void] {
	const $tabStore = useStore(tabStore);

	const localState = useState(initialCurr);
	if (!storeKey) {
		return localState;
	}

	const curr = $tabStore[storeKey]?.curr ?? initialCurr;
	const setCurr = (curr: string) => {
		if (storeKey) {
			tabStore.setKey(storeKey, { curr });
		} else {
			throw new Error("[Tabs] Looks like a sharedStore key is no longer present on your tab view! If your store key is dynamic, consider using a static string value instead.");
		}
	}

	return [curr, setCurr];
}
