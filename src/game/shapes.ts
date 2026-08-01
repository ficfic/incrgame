// GEOMETRY THE BOARD CAN DRAW, DESCRIBED WITHOUT A CANVAS.
//
// ⚠️ THIS EXISTS SO THAT ADDING SOMETHING TO THE MAP IS AN ENTRY IN A LIST
// RATHER THAN SURGERY. `Board.svelte` used to walk two hardcoded arrays — dots
// and lines — so a bridge, a ford, a glyph beside a place, a region tint or an
// encounter marker each meant editing the draw loop. Now the board draws the
// graph (which is the model, and needs DOM twins for tapping) plus a list of
// SHAPES, and a new drawable is data.
//
// Nothing here imports a canvas, a colour or the game. It is shape and nothing
// else, which is what keeps `src/game` free of the shell.
import type { Box } from './layout';
import type { InkName } from './ink';

export interface Pt { x: number; y: number }

export type Shape =
  /** A run of points. `curve` smooths it (Catmull-Rom), `fill` fills it,
   *  `close` joins the ends, `dash` makes it dashed. */
  | { s: 'path'; pts: Pt[]; ink: InkName; w?: number; curve?: boolean;
      fill?: boolean; close?: boolean; dash?: [number, number]; alpha?: number }
  | { s: 'disc'; x: number; y: number; r: number; ink: InkName;
      ring?: InkName; rw?: number; alpha?: number }
  /** ★ DRAWN ONCE INTO AN OFFSCREEN BITMAP AND BLITTED EVER AFTER, keyed by
   *  `key`. For anything static and expensive — five hundred scenery marks
   *  redrawn every frame during a pan would stutter on a phone; one
   *  `drawImage` does not. The inner shapes are ordinary shapes, so the board
   *  needs no second drawing path and nothing here knows it is being cached. */
  | { s: 'baked'; key: string; box: Box; shapes: Shape[]; alpha?: number };
