sherpa
======

Third-party libraries and dependencies for PhET Simulations

By PhET Interactive Simulations
http://phet.colorado.edu/

[List of the third-party code, fonts, images and audio](third-party-licenses.md)

For developers: when adding a new library or changing third-party-licenses.json, please update the third-party-licenses.md
file by following these steps:

1. grunt-all.sh
2. cd $ANY_SIM_DIR$
3. grunt report-third-party --active-runnables=true --input=$TEMP_DIR$ --output=$PATH_TO_SHERPA$/third-party-licenses.md

### Documentation
The [PhET Development Overview](http://bit.ly/phet-development-overview) is the most complete guide to PhET Simulation Development. This guide includes how
to obtain simulation code and its dependencies, notes about architecture & design, how to test and build the sims, as well as other important information.

### License
See the [license](LICENSE)
