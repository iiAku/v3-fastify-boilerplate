const preg_match_all = (regex, haystack) => {
  const globalMatch = haystack.match(new RegExp(regex, "g"));
  const matchArray = [];
  for (let i in globalMatch) {
    nonGlobalMatch = globalMatch[i].match(new RegExp(regex));
    matchArray.push(nonGlobalMatch[1]);
  }
  return matchArray;
};

const preg_match = (body, reg) => body.match(new RegExp(reg));

module.exports = { preg_match_all, preg_match };
