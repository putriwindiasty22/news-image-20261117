[![make.fun · news-image-20261117](https://make.fun/badge/news-image-20261117.svg)](https://make.fun/bounty/news-image-20261117?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)

# The World Today — Tuesday 17 November 2026

A front page that sums up the world's news of Tuesday 17 November 2026 in one
image. `main.ts` (Node 22, standard library only) draws a 1024×1024 PNG
newspaper front page — masthead, a lead story, and six more stories, each with
a small drawn pictogram — using an embedded 5×7 bitmap font. The output is
fully deterministic: the same bytes on every run.

## Stories in the image

- **Lead — Ukraine hits Crimea bridge again:** Ukrainian strikes damage the
  Kerch Bridge for a second straight day; Russia hits bridges in Kyiv.
  Zelenskyy calls it "an unprecedented operation".
- **Mines hit tankers near Hormuz:** several oil tankers struck by mines near
  the Strait of Hormuz and catch fire.
- **Iran drones target U.S. radar in Bahrain:** Iran fires drones at a U.S.
  radar at Sheikh Isa base; Bahrain says the attack was intercepted, no
  casualties.
- **Xi, Trump, Putin to meet in Shenzhen:** China confirms the first
  three-way meeting of the three leaders, Thursday on the APEC sidelines;
  Trump is travelling to Asia.
- **Japan scrambles jets:** two suspected Russian aircraft violate Japanese
  airspace; Tokyo protests strongly.
- **Europe plans Rwanda returns hub:** Germany, Denmark, Austria, Greece and
  the Netherlands plan a joint return facility in Rwanda for rejected asylum
  seekers.
- **Gaza aid plea:** the UK, Australia, Canada and Italy urge Israel to open
  Gaza crossings for aid; the UK sanctions eight Israeli construction firms
  over West Bank settlements.

All events are those reported on 17 November 2026, labelled as reported, with
no invented facts and no speculation shown as fact.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024×1024, under 1 MiB). Run it twice and compare
hashes — the bytes are identical.

## License

MIT — see `LICENSE`.
