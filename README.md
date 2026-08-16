# Can It Run DOOM? — CIS155 "Create Your Own Website" Project

## By DJ Batalona

## Site Idea

DOOM (1993) is remembered almost as much for *where* it's been ported as for
the game itself — hobbyists have spent three decades getting id Software's
original shooter running on hardware that was never meant to play games at
all. This site is a small tour of that phenomenon: the game's history, a
sampling of the strangest devices it's shown up on, and a gallery of the
ports and source ports that make it possible.

## Pages

| Page | File | What's on it |
| --- | --- | --- |
| Home | `index.html` | Intro/hero, a quick "About DOOM" overview, and a signature list of unlikely devices |
| The Story | `story.html` | A two-column history of id Software and the making of DOOM, with a "Quick Facts" sidebar |
| Devices | `devices.html` | A card grid of the odd hardware DOOM has been ported to (calculators, a pregnancy test, tractors, printers...) |
| Gallery | `gallery.html` | A "Hall of Fame" grid of notable ports, a discussion of what counts as a real port, and a table comparing well-known source ports |

## Features

* Responsive layout built with CSS Grid and Flexbox — sidebar nav that
  collapses to a top bar on narrow screens, a card/tile grid for the
  Devices and Gallery pages, a two-column Story layout that stacks on
  narrow screens
* Google Font: **Lora**, loaded from Google Fonts
* Icon: a Font Awesome flame icon next to the homepage title
* Favicon: a red skull silhouette, drawn as an inline SVG (no separate
  image file needed)
* A data table on the Gallery page comparing well-known DOOM source ports
  (Chocolate Doom, PrBoom+, GZDoom, Crispy Doom, Doom Retro)

## Recent Updates

* Fixed the devices page card grid so the last row of cards centers
  instead of being stranded on the left with empty space
* Added a YouTube link in the homepage footer showing how to install a
  DOOM source port yourself
* Fixed the Font Awesome icon, the favicon, and the source-port table so
  they render and line up correctly

## Tech

Plain HTML5 + CSS3 — no frameworks, no build step. Open `index.html` in a
browser to view the site.

## Ideas for later

* Roll the favicon out to `story.html`, `devices.html`, and `gallery.html`
  (currently only on the homepage)
* Have the YouTube footer link open in a new tab, matching the nav's
  external link
* Short clips or screenshots of a few of the devices actually running DOOM
