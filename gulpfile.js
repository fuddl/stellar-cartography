const gulp = require('gulp');
const pug = require('gulp-pug');
const yaml = require('js-yaml');
const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const fontkit = require('fontkit');
const boxIntersect = require('box-intersect');


function fontAdvance(text, fontfile) {
  const font = fontkit.openSync(fontfile);
  const run = font.layout(text);
  return run.advanceWidth;
}

function pcToLj(p) { return p * 3.26156; }

let maynardOffset = {
    x: 23.9,
    y: 61.8,
    z: 0,
  }

function swichXAndY(c) {
  return {
    x: c.y*-1,
    y: c.x*-1,
    z: c.z
  }
}

function normalizeCoordinates(catalog) {
  let maynardEntries = ['Maynard', 'Johnson', 'judgement rites'];
  let coordinates = ['x', 'y', 'z'];
  
  for(thing in catalog) {
    for(entryType of maynardEntries) {
      if(entryType in catalog[thing] && catalog[thing][entryType].coordinates && !catalog[thing][entryType].hasOwnProperty('normalized') ) {
        for(coordinate of coordinates) {
          if(coordinate in catalog[thing][entryType].coordinates) {
            let point = catalog[thing][entryType].coordinates[coordinate] - maynardOffset[coordinate];
            catalog[thing][entryType].coordinates[coordinate] = pcToLj(point);
            catalog[thing][entryType].coordinates.normalized = true;
          }
        }
        catalog[thing][entryType].coordinates = swichXAndY(catalog[thing][entryType].coordinates);
      }
    }
  }

  return catalog;
}

function resolveRelativeCoordinates(catalog) {
  let sources = ['Shisma', 'Maynard', 'Johnson', 'judgement rites', 'DS9', 'ENT', 'DIS', 'VOY', 'Mandel', 'sto', 'Mandel-2018'];
  let coordinates = ['x', 'y', 'z'];

  for(thing in catalog) {
    for(entryType of sources) {
      if(entryType in catalog[thing] && catalog[thing][entryType].coordinates && catalog[thing][entryType].coordinates.hasOwnProperty('relative-to') ) {
        
        let rela = catalog[thing][entryType].coordinates['relative-to'];
        for(coordinate of coordinates) {
          if(coordinate in catalog[thing][entryType].coordinates) {
            catalog[thing][entryType].coordinates[coordinate] = 
              catalog[thing][entryType].coordinates[coordinate] + 
              catalog[rela]['Mandel'].coordinates[coordinate];
          }
        }
      }
    }
  }
  return catalog;
}

function addPreferredValues(catalog) {
  let priorities = ['Shisma', 'DS9', 'ENT', 'DIS', 'VOY', 'Mandel_2018', 'Mandel', 'sto', 'Maynard', 'Johnson', 'judgement rites'];
  for(thing in catalog) {
    for(source of priorities) {
      if (catalog[thing][source]) {
        Object.assign(catalog[thing], catalog[thing][source]);
        break;
      }
    }
  }
  return catalog;
}

gulp.task('pug', function () {
	var catalog = yaml.safeLoad(fs.readFileSync('data/catalog.yml', 'utf8'));
  var catalog = normalizeCoordinates(catalog);
  var catalog = resolveRelativeCoordinates(catalog);
	var catalog = addPreferredValues(catalog);

  var stars = parse(fs.readFileSync('data/stars.csv', 'utf8'));

	return gulp.src('templates/*.pug')
    .pipe(pug({data:{
      catalog: catalog,
      stars: stars,
      fontAdvance: fontAdvance,
      intersect: boxIntersect,
    }}))
    .pipe(gulp.dest('./'));
});
gulp.task('default', ['pug'], function () {
  return gulp.watch(['templates/*.pug', 'data/*.yml'], ['pug']);
});