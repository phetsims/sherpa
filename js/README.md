In https://github.com/phetsims/sherpa/issues/81 we added all of the font awesome icons. However,
in https://github.com/phetsims/chipper/issues/1511
we identified that having all of them slows down transpiling by a significant amount, so we removed the currently unused
ones. To add a new icon, you can find it in d59860591ed131594cb8e2ed9d109ff40594175f and restore it to main.

Before using a Font Awesome icon, be aware that Font Awesome 5 icons are licensed under CC-BY whereas Font Awesome 4
icons are licensed under SIL OFL.