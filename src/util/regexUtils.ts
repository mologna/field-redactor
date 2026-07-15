export const formatRegExp = (regex: RegExp): string => `/${regex.source}/${regex.flags}`;

export const regexIdentity = (regex: RegExp): string => `${regex.source}\0${regex.flags}`;
