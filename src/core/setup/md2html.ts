
function md2html(text: string): string {
        text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
        text = text.replace(/__(.*?)__/g, "<u>$1</u>");
        text = text.replace(/\*(.*?)\*/g, "<i>$1</i>");
        text = text.replace(/_(.*?)_/g, "<i>$1</i>");
        text = text.replace(/~~(.*?)~~/g, "<s>$1</s>");
        text = text.replace(/\|\|(.*?)\|\|/g, "<tg-spoiler>$1</tg-spoiler>");
        text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

        return text;
}

/***********************
 * Export the function *
 ***********************/

export default md2html