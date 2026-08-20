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
| Devices | `devices.html` | A card layout of the odd hardware DOOM has been ported to (calculators, a pregnancy test, tractors, printers...) |
| Gallery | `gallery.html` | A "Hall of Fame" grid of notable ports, a discussion of what counts as a real port, and a table comparing well-known source ports |

## File layout

```text
my-website/
  index.html  story.html  devices.html  gallery.html
  css/
    theme.css     shared colors, fonts and decoration
    layout.css    shared structure, flex/grid containers, all shared breakpoints
    story.css     two-column reading layout
    devices.css   card layout
    gallery.css   named-area grid and the source-port table
  img/
    doom-header.jpg
  README.md
```

Every page loads `theme.css`, then `layout.css`, then its own stylesheet.
Layout comes second so its breakpoints always win over the plain rules in
the theme.

## Features

* Responsive layout built with CSS Grid and Flexbox — a sidebar nav that
  collapses to a top bar on narrow screens, a card layout on Devices, a
  named-area grid on Gallery, and a two-column Story layout that stacks
* Six shared breakpoints in `layout.css` (75rem, 62rem, 48rem, 40rem,
  30rem, 22.5rem), plus page-specific ones in the page stylesheets
* Google Font: **Lora**, loaded from Google Fonts
* Icon: a Font Awesome flame beside every page title
* Favicon: a red skull silhouette, drawn as an inline SVG so there is no
  separate image file
* Inline SVG icons on every device card and gallery tile, marked
  `aria-hidden` because the heading beside each one is the real label
* A data table on the Gallery page comparing well-known DOOM source ports
  (Chocolate Doom, PrBoom+, GZDoom, Crispy Doom, Doom Retro)
* Accessibility: a skip-to-content link, a visible keyboard focus ring,
  `scope` on every table header, and heading colors that clear the 4.5:1
  contrast minimum

## Recent Updates

* Reorganized the project files — the banner moved to `img/doom-header.jpg`,
  `styles.css` became `css/layout.css`, and `css/index.css` became
  `css/theme.css` since it is shared by all four pages
* Removed leftover stylesheets from earlier assignments
* Split the two shared stylesheets by job so nothing is declared twice —
  theme owns color and type, layout owns structure and breakpoints
* Rolled the favicon and the Font Awesome flame out to all four pages
* Added a skip link, a keyboard focus ring, and a lighter heading red for
  contrast
* Added SVG icons to the device cards and gallery tiles
* Fixed the devices page card layout so the last row of cards centers
  instead of being stranded on the left with empty space
* Added a YouTube install-guide link to every page footer, opening in a new
  tab like the nav's external link

## Tech

Plain HTML5 + CSS3 — no frameworks, no build step. Open `index.html` in a
browser to view the site. Deployed to GitHub Pages by
`.github/workflows/static.yml` on every push to `main`.

## Ideas for later

* Short clips or screenshots of a few of the devices actually running DOOM
* A page on the WAD file format and how custom levels get loaded
