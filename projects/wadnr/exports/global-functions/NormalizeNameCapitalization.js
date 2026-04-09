/**
 * VV.Form.Global.NormalizeNameCapitalization
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (name) {
if (!name) return name;

let prefixes = [
  "D'",
  "Mac",
  "Mc",
  "O'",
  "De",
  "Di",
  "Van",
  "Von",
  "La",
  "Le",
  "St.",
  "Fitz",
  "Ben",
  "Al",
];

return name
  .split(" ")
  .map((word) => {
    if (!word) return word;

    for (let prefix of prefixes) {
      if (word.toLowerCase().startsWith(prefix.toLowerCase())) {
        let prefixLength = prefix.length;
        return (
          prefix.charAt(0).toUpperCase() +
          prefix.slice(1).toLowerCase() +
          word.charAt(prefixLength).toUpperCase() +
          word.slice(prefixLength + 1).toLowerCase()
        );
      }
    }
    
    return word
      .split(/[-']/)
      .map((part) => {
        if (!part) return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("-");
  })
  .join(" ");

}
