// Mappe-data for /admin/
// ----------------------------------------------------------------------------
// Skjult verktøy – samme «skjult som standard»-mønster som /leir/:
//   - noindex: true  -> <meta name="robots" content="noindex, nofollow">
//   - eleventyExcludeFromCollections: true -> ikke i Eleventy-samlinger
// Verktøyet lenkes ikke fra menyen og nås kun via direkte URL: /admin/
// (Ulistet – ikke reell innlogging, siden dette er en statisk side.)
module.exports = {
  layout: "admin.njk",
  noindex: true,
  eleventyExcludeFromCollections: true,
};
