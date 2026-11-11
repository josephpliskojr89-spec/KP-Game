/* The staff's year, read (v0.11.46, §139). The letter the staff write in the first week of a year, taken apart
 * line by line, and what a chair's word claims of its year. This module holds no copy of the engine's lines: it
 * reads the shapes a line must have. The long haul holds every letter of a career to its own books through it,
 * and suite_149 holds it to every line the engine can write. */
'use strict';
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const num = w => { const i = WORDS.indexOf(String(w).toLowerCase()); return i >= 0 ? i : /^\d+$/.test(String(w)) ? Number(w) : null; };
const sentences = text => String(text || '').split(/(?<=[.?!]) /).filter(Boolean);

// the letter: its year, the eras it gives the house (null when the heading cannot be read), and a line a chair.
// A line is { name, label, weeks | years | arrived, word }: the word is null for a chair too new to have one
function read(text) {
  const rows = String(text).split('\n');
  const head = /^Year (\d+), as the staff tell it\. The house put out (nothing|one era|(\d+) eras)[.,:]/.exec(rows[0]);
  const lines = rows.slice(1).map(row => {
    const m = /^(.+?), ([^,]+), (just arrived|\w+ weeks in|a year in|\w+ years in): (?:“(.*)”|too new to the chair for a word on the year\.)$/.exec(row);
    if (!m) return { raw: row, bad: true };
    const t = /^(\w+) (weeks|year|years) in$/.exec(m[3]);
    const n = !t ? null : t[1] === 'a' ? 1 : num(t[1]);
    return { raw: row, name: m[1], label: m[2], arrived: !t, weeks: t && t[2] === 'weeks' ? n : null, years: t && t[2] !== 'weeks' ? n : null,
      word: m[4] != null ? m[4] : null };
  });
  return { year: head ? Number(head[1]) : null, house: !head ? null : head[2] === 'nothing' ? 0 : head[2] === 'one era' ? 1 : Number(head[3]), lines };
}

// what a word claims of the chair's year: that a record closed with a trophy, that every record closed cold, that
// nothing came of it, and a count where the word opens on one (a scout's signings, a studio chair's records)
const NOTHING = new RegExp('^(?:' + ['No record', 'No demo', 'Not one demo', 'Nothing ', 'There was no record', 'My room’s counts went under no record',
  'The dance room had no record', 'A quiet stretch', 'A campaign needs a record, and there was none', 'No release', 'The campaign desk had no record',
  'Nobody ', 'No signing', 'The roster added nobody', 'No production', 'My studio put nothing', 'No song of mine', 'No writing credit',
  'That is \\w+ years running with (?:nobody|nothing)', '\\w+ years (?:now )?without'].join('|') + ')');
// and where the chair counts whole years running with nothing, the count
const RUNNING = /^(?:That is (\w+) years running|(\w+) years (?:now )?without|No [a-z ]+, (\w+) years running\.)/;
function claims(word) {
  const w = String(word || '');
  const nothing = NOTHING.test(w);
  const m = /^(?:I (?:produced|wrote) )?(\w+) /.exec(w), r = RUNNING.exec(w);
  return { trophy: /trophy/.test(w), cold: /closed cold|cold stretch/.test(w), nothing, count: nothing ? 0 : m ? num(m[1]) : null,
    running: r ? num(r[1] || r[2] || r[3]) : null };
}

module.exports = { read, claims, sentences, num };
