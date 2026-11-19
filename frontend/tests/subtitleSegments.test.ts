import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSubtitleSegments } from '../src/subtitleSegments.ts'

test('preserves timed Persian segments and provides unique editor IDs', () => {
  const segments = parseSubtitleSegments([{ start: 0, end: 2.5, text: ' سلام دنیا ' }, { start: 3, end: 4, text: 'ادامه' }])
  assert.equal(segments.length, 2)
  assert.equal(segments[0].text, 'سلام دنیا')
  assert.equal(segments[0].start, 0)
  assert.equal(segments[0].end, 2.5)
  assert.notEqual(segments[0].id, segments[1].id)
})

test('rejects malformed segments without inventing timing from plain text', () => {
  assert.deepEqual(parseSubtitleSegments(null), [])
  assert.deepEqual(parseSubtitleSegments('plain transcript'), [])
  assert.deepEqual(parseSubtitleSegments([null, {}, { start: -1, end: 2, text: 'x' }, { start: 2, end: 1, text: 'x' }, { start: 0, end: Infinity, text: 'x' }, { start: '0', end: 2, text: 'x' }, { start: 0, end: 1, text: '  ' }]), [])
})

test('accepts optional word confidence and ignores invalid confidence', () => {
  const [segment] = parseSubtitleSegments([{ start: 0, end: 2, text: 'hello world', words: [null, { word: 'hello', probability: 0.4 }, { word: 'world', probability: 1.1 }] }])
  assert.equal(segment.words?.[0].probability, 0.4)
  assert.equal(segment.words?.[1].probability, undefined)
  const [legacy] = parseSubtitleSegments([{ start: 0, end: 2, text: 'hello', avg_logprob: -1.5 }])
  assert.equal(legacy.words, undefined)
})
