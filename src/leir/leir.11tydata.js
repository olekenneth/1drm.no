// Mappe-data for /leir/
// ----------------------------------------------------------------------------
// Alt som legges i denne mappa er SKJULT som standard:
//   - noindex: true  -> <meta name="robots" content="noindex, nofollow">
//     (søkemotorer lister ikke sida; den nås kun via direkte URL)
//   - eleventyExcludeFromCollections: true -> dukker ikke opp i Eleventy-samlinger
//
// Vil du gjøre en side OFFENTLIG (synlig/indeksert), overstyrer du i sidas
// egen front matter med:
//   noindex: false
//   eleventyExcludeFromCollections: false
//
// Front matter i sjølve sida vinner alltid over denne fila (Eleventy data-cascade).
module.exports = {
  layout: "base.njk",
  noindex: true,
  eleventyExcludeFromCollections: true,
};
