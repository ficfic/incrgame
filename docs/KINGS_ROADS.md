# King's Roads

**The owner's design, 2026-08-02, transcribed.** Everything here comes from what
they said in one sitting. Where a line had to be inferred to make the thing
buildable it is marked **⟨inferred⟩** and can be struck without touching the
rest.

⚠️ **Written this way on purpose.** On the same day, three batches of ideas that
this assistant generated were reviewed and **nineteen of twenty were scrapped**,
including a whole invented world. The lesson is not "try harder" — it is that
the design is the owner's and the job here is to write it down accurately. Read
anything marked ⟨inferred⟩ with suspicion.

**This supersedes `docs/FRONTIER.md`**, which is now in `docs/attic/`.

---

# THE NAME

**King's Roads.**

# THE OPENING

> *"we come in with a caravan over the mountain pass in order to build some shit
> and then a poor weather happens and the bandits attack and so on and the
> caravan is lost and people are scattered and we run through the night and end
> up who knows where, and that's the beginning of the story"*

A caravan over the pass. Weather turns. Bandits. The caravan is lost, the people
are scattered, you run through the night, and you end up somewhere you cannot
name. That is the first screen.

**What it hands the player:** no team, no supplies, no map, no idea where they
are. A clean zero, and a reason for every one of those to be zero.

# WHO YOU ARE

> *"we understand that we've got a set of tools and we are in the wilderness but
> like for some reason we build kings roads"*
> *"yeah it's just the job"*

You have your tools. You were the road crew — that is why you have them, and
building the road is simply the job. **No mystery about it.** Nobody is hiding
anything from the player about who they are or why they are here.

# ★ THE VOCABULARY

> *"we are going to call the roads and stops, no edges and nodes anymore"*

| the thing | the word | never |
|---|---|---|
| a point on the map | **stop** | node, dot, station, place |
| a link between two | **road** | edge, way, connection, line |

⚠️ **This reverses the node/edge decision made earlier the same day**, which had
itself replaced dot/connection. `scripts/check-words.mjs` is the build gate and
must ban the old words, or they come back — they have come back twice already.

# ★ MANA

> *"kingdoms mana flows through the roads, and our goal is to like saturate the
> land or something in order to join this land into kings domain"*
> *"it's also a resource but it's scarce until you've finished the location and
> once you're finished it's abundant but like you don't need it anymore"*
> *"mana is spent for all kinds of stuff, yeah.. i guess to build too, that's
> why you can't build from the middle"*

**Mana flows through built road, out from the king's domain.** It is what makes
the land part of the kingdom, and it is what you spend.

Two consequences, and they are the spine of the game:

**1. You cannot build from the middle.** Mana only reaches where road already
runs, so construction is contiguous — you extend from where the mana is. This is
why the whole opening exists: you are not walking home, **you are walking to the
only place you are able to start.**

**2. Its curve is inverted, and that is the point.** Mana is scarce while a
region is unfinished and abundant once it is done — at which point you no longer
need it. So **the resource itself tells you when to leave.** The constraint
disappearing IS the completion signal, and no percentage bar has to say so.

# ★ A CHAPTER IS A CROSSING

> *"the goal of a chapter is to make a path end to end from the start to finish,
> and dotted lines point to at least 5-6 options how you can do it"*
> *"one path yeah, done is done"*

A chapter has a **start** and a **finish**. Between them the map shows **five or
six dotted routes** — different ways across.

**You build one, end to end. Done is done.** The chapter does not stay open to be
completed later.

★ **This is a route-choice game, not a network optimiser.** The choice is the
whole thing and it is on the board from the first frame. Every previous design
in this repo made the graph a surface to optimise on; this one makes picking a
line across it the game.

## What separates the routes

> *"all different, cyoa, stops, terrain; everything"*

Everything: the stops on them, the terrain they cross, the events they carry,
what is living on them. Two routes to the same finish are two different
chapters' worth of content, and choosing one means not seeing the other.

## The other kind of line

> *"there are some secret like different kinds of lines (more sparsely dotted)
> which lead to secrets and shortcuts and so on"*
> *"need a skill or something… or roll high on event"*

**Sparsely dotted roads** lead to secrets and shortcuts. They open to a **skill**
or to **a high roll on an event** — so a shortcut is something you earn or luck
into, never something you simply walk to.

⟨inferred⟩ They are drawn from the start, sparse, so you can see there is
something there and not what it is.

# THE TUTORIAL

> *"our first goals is going to go back to where the kings road ends and start
> building from there, so first we're just gathering resources and traveling
> back through the nodes without building tutorial style"*
> *"we'd need like a team in order to do it effectively, so let's say we get
> them during the tutorial also"*
> *"well mix of locations"*

You walk **back** to where the king's road ends. No building — you cannot,
there is no mana out here. On the way you **gather resources** and **pick up your
team**, who were scattered the same night you were.

A mix of locations on the way back.

★ **The tutorial teaches by inversion.** Every other game of this shape starts
you at safety and pushes you out. This one starts you lost and walks you in, so
by the time you can build you already know how the map reads.

# ROLLS, STATS AND WHAT YOU CARRY

> *"we have some stats that helps us with various 2D10 rolls we are doing"*
> *"rolls are for choose your own adventure stuff"*
> *"we have an inventory of things that improves shit"*

- **2d10**, and **only for choose-your-own-adventure events.** Not for building,
  not for income, not for combat resolution unless combat is an event.
- **Stats** improve the rolls.
- **An inventory** of things that improve things.

⚠️ **The engine currently has NO randomness at all** — it is pure, and that is
why the save layer is four lines. Dice mean a seeded roller living in the save.
That is a real change and it should be made deliberately, not slipped in.

# WHAT IS OUT THERE

> *"we'll have to deal with the weather, the bandits, the wildlife, the creepy
> shit, and so on, region through region"*

Weather. Bandits. Wildlife. Creepy shit. Region by region.

> *"there are caravans and threats"*

Caravans and threats. ⟨inferred⟩ A caravan is presumably a thing that moves on
finished road — yours or somebody's — which would make a built road a place
where things happen rather than a line that is finished.

# TIME

> *"don't scrap offline, let's see how it goes. mainly short timers for now
> though"*

**Short timers.** Offline stays, unproven, and is to be judged by playing rather
than argued about.

# THE GROUND AND THE WEATHER

Carried forward from the owner's earlier asks, which survived every scrapping:

> *"i think it'd be fun to also add topology to our map, like heights and
> isolines of the same heights to signal hills and valleys"*
> *"i want to also add weather (graphical) and these height isolines"*

**Contours** at a fixed interval; close-packed means steep. Drawn once by
marching squares into the offscreen bitmap the scenery already bakes into, so
they cost one `drawImage` a frame.

**Weather**, graphical, and — since it is one of the four things out there —
presumably also a threat rather than only a picture.

⚠️ Every new ink must clear `test/ink.test.ts`'s distances from the counted ones,
and there is no `shadowBlur` anywhere in this codebase.

---

# WHAT SURVIVES IN THE CODE

Reviewed item by item with the owner on 2026-08-02. **Everything in the game
loop was scrapped**: settling, working, the skill, the doors, the keys, the
fights, the max-flow income, the nameless resource.

**What stands:**

| | |
|---|---|
| the board | canvas, d3-force layout, pan, zoom, drag, the fill animation |
| the terrain bake | scenery and river, one `drawImage` a frame |
| the four tabs | Journey, Here, Self, Thoughts — the owner's ask, kept |
| the layout solver | deterministic, tested |
| the palette | `ink.ts`, one definition, with the probe reading it off the page |
| the save layer | IndexedDB, refuses a save it cannot honour |
| the probe | `scripts/play-tabs.mjs` — plays the real UI in a real browser |
| the word gate | `scripts/check-words.mjs` — the one item of ten kept in review |

**And the 37 hand-written places are scrapped too.** They were machine-written by
earlier sessions, not by the owner, and the owner corrected the attribution and
cut them. The map has no prose. What a stop is made of is the first open
question of the next session.

# THE OPEN QUESTIONS

Not to be answered by this assistant inventing something.

1. **What is a stop made of** now that there is no prose? A name and a terrain
   type? A CYOA scene? Something else.
2. **How many chapters**, and is the first one the tutorial or does the tutorial
   come before chapter one.
3. **What the stats are.** They exist to move 2d10 rolls; nothing says which.
4. **What resources exist besides mana** — the opening has you gathering, and
   gathering implies something to gather.
5. **Whether the dice go in the engine**, given it currently guarantees none.
