import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateFans } from './rules';
import { Tile } from './types';

function tile(suit: Tile['suit'], value: number, id: string): Tile {
  return { id, suit, value, name: `${value} ${suit}`, chinese: `${suit}${value}` };
}

function names(hand: Tile[], melds: { type: 'peng' | 'an_gang'; tiles: Tile[] }[], winning: Tile, isZimo = false) {
  return calculateFans(hand, melds, winning, isZimo, 0, 'east', [tile('flower', 1, 'flower')], 0).fans.map(fan => fan.name);
}

describe('fan patterns', () => {
  it('scores Little Three Dragons instead of the two separate dragon pungs', () => {
    const scored = names(
      [tile('dragon', 3, 'white-a')],
      [
        { type: 'peng', tiles: [1, 2, 3].map(copy => tile('dragon', 1, `red-${copy}`)) },
        { type: 'peng', tiles: [1, 2, 3].map(copy => tile('dragon', 2, `green-${copy}`)) },
      ],
      tile('dragon', 3, 'white-b'),
    );
    assert.ok(scored.includes('Little Three Dragons'));
    assert.equal(scored.some(name => name.includes('Dragon Pung')), false);
  });

  it('still scores Big Three Dragons when all three dragons are pungs', () => {
    const scored = names(
      [tile('wan', 1, 'filler')],
      [
        { type: 'peng', tiles: [1, 2, 3].map(copy => tile('dragon', 1, `red-${copy}`)) },
        { type: 'peng', tiles: [1, 2, 3].map(copy => tile('dragon', 2, `green-${copy}`)) },
        { type: 'peng', tiles: [1, 2, 3].map(copy => tile('dragon', 3, `white-${copy}`)) },
      ],
      tile('wan', 1, 'filler-win'),
    );
    assert.ok(scored.includes('Big Three Dragons'));
    assert.equal(scored.includes('Little Three Dragons'), false);
  });

  it('keeps men qing with a concealed kong and drops it for a pung or a self-draw', () => {
    const concealed = names(
      [tile('tong', 1, 'a')],
      [{ type: 'an_gang', tiles: [1, 2, 3, 4].map(copy => tile('wan', 1, `k${copy}`)) }],
      tile('tong', 1, 'b'),
    );
    const exposed = names(
      [tile('tong', 1, 'a')],
      [{ type: 'peng', tiles: [1, 2, 3].map(copy => tile('wan', 2, `p${copy}`)) }],
      tile('tong', 1, 'b'),
    );
    const selfDraw = names(
      [tile('tong', 1, 'a')],
      [{ type: 'an_gang', tiles: [1, 2, 3, 4].map(copy => tile('wan', 1, `k${copy}`)) }],
      tile('tong', 1, 'b'),
      true,
    );
    assert.ok(concealed.includes('Concealed Hand'));
    assert.equal(exposed.includes('Concealed Hand'), false);
    assert.equal(selfDraw.includes('Concealed Hand'), false);
  });
});
