const _ = require('lodash');
const wrap = require('word-wrap');

const defaultSubjectSeparator = ': ';
const defaultMaxLineWidth = 100;
const defaultBreaklineChar = '|';
const defaultTicketSeparator = ',';

const addTicketNumber = (ticketNumbers, skipTicketPrefix, config) => {
  const separator = _.get(config, 'ticketSeparator', defaultTicketSeparator);
  let results;
  let tickets = ticketNumbers.trim().split(separator);
  let skipPrefix = skipTicketPrefix && skipTicketPrefix === 'yes';

  if (!ticketNumbers) {
    return '';
  }

  tickets.forEach(ticketNumber => {
    let result = ticketNumber.trim();

    if (config.ticketNumberPrefix && !skipPrefix) {
      result = `${config.ticketNumberPrefix}${result}`;
      // result = `${tickets.map(n => config.ticketNumberPrefix.concat(n.trim())).join(', ')} `;
    }

    if (config.ticketNumberSuffix || config.ticketNumberSuffix === '') {
      result = `${result}${config.ticketNumberSuffix}`;
    } else {
      result = `${result} `;
    }

    results.push(result);
  });

  return results.join(', ');
};

const addScope = (scope, config) => {
  const separator = _.get(config, 'subjectSeparator', defaultSubjectSeparator);

  if (!scope) return separator; // it could be type === WIP. So there is no scope

  return `(${scope.trim()})${separator}`;
};

const addSubject = subject => _.trim(subject);

const addType = (type, config) => {
  const prefix = _.get(config, 'typePrefix', '');
  const suffix = _.get(config, 'typeSuffix', '');

  return _.trim(`${prefix}${type}${suffix}`);
};

const addBreaklinesIfNeeded = (value, breaklineChar = defaultBreaklineChar) =>
  value
    .split(breaklineChar)
    .join('\n')
    .valueOf();

const addFooter = (footer, config) => {
  if (config && config.footerPrefix === '') return `\n\n${footer}`;

  const footerPrefix = config && config.footerPrefix ? config.footerPrefix : 'ISSUES CLOSED:';

  return `\n\n${footerPrefix} ${addBreaklinesIfNeeded(footer, config.breaklineChar)}`;
};

const escapeSpecialChars = result => {
  // eslint-disable-next-line no-useless-escape
  const specialChars = ['`'];

  let newResult = result;
  // eslint-disable-next-line array-callback-return
  specialChars.map(item => {
    // If user types "feat: `string`", the commit preview should show "feat: `\string\`".
    // Don't worry. The git log will be "feat: `string`"
    newResult = result.replace(new RegExp(item, 'g'), '\\`');
  });
  return newResult;
};

module.exports = (answers, config) => {
  const wrapOptions = {
    trim: true,
    newline: '\n',
    indent: '',
    width: defaultMaxLineWidth,
  };
  let head;

  switch (config.ticketNumberPosition) {
    case 'first':
      // Hard limit this line
      head = (
        addTicketNumber(answers.ticketNumber, answers.skipTicketPrefix, config) +
        addType(answers.type, config) +
        addScope(answers.scope, config) +
        addSubject(answers.subject)
      ).slice(0, defaultMaxLineWidth);
      break;
    case 'last':
      // Hard limit this line
      head = (
        addType(answers.type, config) +
        addScope(answers.scope, config) +
        addSubject(answers.subject) +
        addTicketNumber(answers.ticketNumber, answers.skipTicketPrefix, config)
      ).slice(0, defaultMaxLineWidth);
      break;
    case 'standard':
    default:
      // Hard limit this line
      head = (
        addType(answers.type, config) +
        addScope(answers.scope, config) +
        addTicketNumber(answers.ticketNumber, answers.skipTicketPrefix, config) +
        addSubject(answers.subject)
      ).slice(0, defaultMaxLineWidth);
      break;
  }

  // Wrap these lines at 100 characters
  let body = wrap(answers.body, wrapOptions) || '';
  body = addBreaklinesIfNeeded(body, config.breaklineChar);

  const breaking = wrap(answers.breaking, wrapOptions);
  const footer = wrap(answers.footer, wrapOptions);

  let result = head;
  if (body) {
    result += `\n\n${body}`;
  }
  if (breaking) {
    const breakingPrefix = config && config.breakingPrefix ? config.breakingPrefix : 'BREAKING CHANGE:';
    result += `\n\n${breakingPrefix}\n${breaking}`;
  }
  if (footer) {
    result += addFooter(footer, config);
  }

  return escapeSpecialChars(result);
};
