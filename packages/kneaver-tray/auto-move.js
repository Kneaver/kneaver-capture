// Open Sourced "as-is"
'use strict';
const path = require( 'path');
const fs = require( 'fs');
const KNVBase = require('kneaver-stdjs/KNVBase');
const KNVTrace = require('kneaver-stdjs/KNVTrace');
KNVTrace.On();
const { MoveFile } = require('kneaver-stdscripts/KNVfs');

function MoveBack( Type, Dir, event, filename, Tray, filters)
{
  // temporary filenames for screenshots
  if ( filename.startsWith( ".Image"))
    return;

  if (filters.reduce( function( prev, elem) { 
      if (elem.test( filename)) 
        return true; 
      return prev
    }, false))
  {
    let T = new KNVTrace.Proc( "MoveBack")
    .TVAR( "Dir", Dir)
    .TVAR( "event", event)
    .TVAR( "filename", filename)
    .TVAR( "filters", filters)
    .D()
    ;
    let ext = path.extname( filename);
    let basename = path.basename( filename, ext);
    if ( ext == ".jpg_large")
      ext = ".jpg";
    if ( ext == ".jpeg")
      ext = ".jpg";
    basename = basename.replace( "Image- ", "Image-");
    let Source = path.join( Dir, filename);
    // test file still exists to avoid numbers jump for no use
    setTimeout( () => {
      if ( fs.existsSync( Source))
      {
        let Target;
        if ( Type === "mhtml")
          Target = Tray.ComposeFileName( 'Mhtml', ext, basename); // <-- only this is used
        else
          Target = Tray.ComposeFileName( 'scr', ext);
        console.log("match", Type, Dir, basename, ext, filename, Target );
        MoveFile( Source, Target);
      }
    }, 10*1000);
    T.Exit();
  }
}

function Watch( Tray)
{
  // For some reasons trace and console.log appear long after
  // if you don't see them, you watch the wrong directory :)

  function CatchupAndWatch( Dir, Filters)
  {
    fs.readdirSync( Dir).forEach( function (filename) {
      MoveBack( "mhtml", Dir, 'create', filename, Tray, Filters);
    });

    // Can't use ~
    fs.watch( Dir, { recursive: false}, function( event, filename) {
      // console.log(`event type is: ${event}`);
      MoveBack( "mhtml", Dir, event, filename, Tray, Filters);
    })
  };
  CatchupAndWatch( "~/Downloads", 
    [ /.*\.mhtml$/, /.*\.png$/, /.*\.jpg$/, /.*\.jpeg$/, /.*\.jpg_large$/]);
  // default directory for screenshots
  CatchupAndWatch("~/Documents", 
    [ /Image.*\.png$/, /Screenshot_.*\.png$/, /Screen Shot .*\.png$/]);
}
module.exports = Watch;

function Repair( Tray, Root)
{
  function Recur( Path)
  {
    let files = fs.readdirSync( Path);
    files.forEach( ( file) => {
      let fullPath = path.join( Path, file);
      var stat = fs.statSync( fullPath);
      if ( stat.isFile()) {
        let newName = file;

        // Patched a Bourde
        // if ( /-([a-zA-Z]{1,5})$/.test( newName))
        //   newName = newName.replace( /-([a-zA-Z]{1,5})$/, ".$1");

        if ( /-\.Image/.test( newName))
        {
          newName = newName.replace( /-\.Image/, "-Image");
        }
        if ( /Image- 201/.test( newName))
        {
          newName = newName.replace( /Image- 201/, "Image-201");
        }
        let matches = [];
        let match;
        let regex1 = /Image-\d\d\d\d-\d\d-\d\d/g; //must be a variable

        while ((match = regex1.exec( newName)) !== null) {
          matches.push( match);
          // console.log(`Found ${match[0]} start=${match.index}. Next starts at ${regex1.lastIndex}`);
        };
        // let matches = [...newName.matchAll(/Image-\d\d\d\d-\d\d-\d\d/g)];
        if ( matches)
        if ( matches.length == 2)
        {
          if ( matches[ 0][0] === matches[ 1][0])
          {
            let head = newName.substr( 0, matches[ 1].index);
            let tail = newName.substr( matches[ 1].index);
            tail = tail.replace( matches[ 1][0], "");
            newName = head + tail;
          }
        }
        if ( /- at /.test( newName))
        {
          newName = newName.replace( /- at /, "-");
        }
        if ( file != newName)
        {
          console.log( "oldName", file);
          console.log( "newName", newName);
          fs.renameSync( fullPath, path.join( Path, newName));
        }
      }
      else
      if( stat.isDirectory()) 
      {
        Recur( fullPath);
      }
    })
  }

  Recur( Root);
  console.log("Repair Done");
}

if (require.main === module) {
  // https://nodejs.org/docs/latest/api/all.html#modules_accessing_the_main_module
  const CTrayMin = require( './tray-min.js');
  let Tray = new CTrayMin();

  // Repair( Tray, "~/Documents/Kneaver");
  Watch( Tray);
}