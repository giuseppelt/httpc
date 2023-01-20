import { loadTheme } from "shiki";

const theme = await loadTheme("themes/nord.json");

// change comment color: make lighter
const colorComment = "#818ca2";
theme.settings.find(x => x.name === "Comment")!.settings.foreground = colorComment;
theme.settings.find(x => x.name === "Punctuation Definition Comment")!.settings.foreground = colorComment;

export default theme;
