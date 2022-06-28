// Open Sourced "as-is"
// const util = require( 'util');
const path = require( 'path');
const fs = require( 'fs');
// const spawn = require('child_process').spawn;
const KNVBase = require('kneaver-stdjs/KNVBase');
const { CreateDirDeep } = require('kneaver-stdscripts/KNVfs');
const CRSSystemSubst = require( 'kneaver-stdscripts/system-subst.js');
const SubstPercent = require( 'kneaver-stdjs/subst-percent.js').SubstPercent;
const CKNVStringReader = require( 'kneaver-stdjs/string-reader.js').CKNVStringReader;
const Transcode2 = require( 'kneaver-stdjs/string-reader.js').Transcode2;

/*
function StrPercent( a)
{
  return "%" + a + "%";
}

function DateNowSUTC()
{
  let d = new Date();
  return KNVBase.trailingZeros(d.getUTCFullYear(),4) + "-" + KNVBase.trailingZeros(d.getUTCMonth()+1,2) + "-" + KNVBase.trailingZeros(d.getUTCDate(),2);
}
*/

function GetHomePath()
{
  if ( process.env.hasOwnProperty( "HOME"))
    return process.env[ "HOME"];
  else
    return process.env[ "HOMEDRIVE"] + process.env[ "HOMEPATH"] + "\\Documents";
}

const KNVNamingTool = require( './NamingTool.js');

class CSettings {
  GetStr( Name, Default)
  {
      return Default;
  }
}
let Settings = new CSettings()

function FileSubst( Str)
{
  // console.log( "FileSubst", Str);
  let Subst = new CRSSystemSubst();
  let /*<CKNVStringBuilder2, CKNVStringReader,CRSSystemSubst>*/ S = new SubstPercent( Subst);
  let Reader = new CKNVStringReader( Str);
  let NewStr = Transcode2( Reader, S).m_Buffer;
//#ifndef SERVER_API_ONLY
  if ( NewStr[ 0] == "~")
    NewStr = GetHomePath() + NewStr.substr( 1);
//#endif
  return NewStr;
}

class CTrayMin {
  constructor()
  {
    this.m_DayPath = "";
    this.m_FileCount = 0;
    this.m_ReservedNames = {};
    // let ReserveList = {};
    this.Types = [
        {
          Type: "Not",
          Exts: ['.htm']
        },
        {
          Type: "Scr",
          Exts: ['.jpg', '.png']
        },
        {
          Type: "Mhtml",
          Exts: ['.mhtml', '.htm', '.html']
        },
      ];
    // console.log( "kneaver-tray", "creating KNVNamingTool");
    this.m_NamingTool = new KNVNamingTool( Settings, "Kneaver", "1.0.0", "Tray", "1.0.0");
    this.UpdateDayPath( Settings);
  }

  UpdateDayPath2( DayPath2, FileCount2)
  {
    // console.log( "UpdateDayPath2", DayPath2, FileCount2);
    // DayPath2 is like /Users/brunowinck/Documents/Kneaver/ToSort/2019-09-24/Image-2019-09-24
    let Count = FileCount2;
    let LastFound = FileCount2;
    // No holes are larger than 50
    let basename = path.basename( DayPath2);
    let files = [];
    if ( fs.existsSync( path.dirname( DayPath2)))
      files = fs.readdirSync( path.dirname( DayPath2));
    while ( (Count < 1000) && (Count < LastFound + 50))
    {
    	let Exist = false;
    	Count++;
      // console.log( "Count", Count);
      let Name = path.basename( this.ComposeFileName2( DayPath2, Count, "", ""));
      let found = files.find( ( file) => {
        if ( file.startsWith( basename))
        {
          // console.log( "Name", Name, "file", file);
          let basenameSansExt = path.basename( file);
          if ( basenameSansExt.startsWith( Name))
            return true;
          else
            return false;
          // compare Image-2019-09-24-0039-02.23.20.png and Image-2019-09-24-0039-XX.XX
        }
        else
          return false;
      })
      if ( found)
      {
        // console.log( "found", Name, found);
        LastFound = Count;
      }
      else
      for ( let i = 0; (i < this.Types.length) && ( !Exist); i++)
    	{
        for ( let j = 0; (j < this.Types[ i].Exts.length) && ( !Exist); j++)
  	    {
          let Name = this.ComposeFileName2( DayPath2, Count, this.Types[ i].Type, this.Types[ i].Exts[ j]);
  		    if ( fs.existsSync( Name))
          {
            // console.log( "fs.existsSync", Count, i, j, Name);
      			Exist = true;
          }
  		    else
    		    if ( this.m_ReservedNames.hasOwnProperty( Name))
            {
              // console.log( "reserved", Name);
        			Exist = true;
            }
            else {
              // console.log( "not found", Count, i, j, Name);
            }
  		    if (Exist)
      			LastFound = Count;
    		}
	    }
  	}
    // Thread protect
    return LastFound;
  }

  UpdateDayPath( Settings)
  {
    // console.log( "UpdateDayPath", Settings);
    let DayPath1 = Settings.GetStr( "Path", "~/Documents/Kneaver/0. Inbox/%DATE%/Image-%DATE%");
    let DayPath2 = FileSubst( DayPath1);
    let NewDay = (DayPath2 != this.m_DayPath);
    let FileCount2 = NewDay?0:this.m_FileCount;
    // console.log( "UpdateDayPath", DayPath2);
    let Count = this.UpdateDayPath2( DayPath2, FileCount2);
    // console.log( "UpdateDayPath", NewDay, DayPath2, Count);
    if (NewDay)
      this.m_DayPath = DayPath2;
    this.m_FileCount = Count;
  }

  ComposeFileName2( DayPath, Count, Type, Ext, Extra = "")
  {
    // console.log( "ComposeFileName2", DayPath, Count, Type, Ext);
    // *Res = RSCharTraitX<char>::MakeSysString( ComposeFileName2( m_DayPath, Reason, 0, 4, -m_FileCount, _T(""), Extension));
    // let OutputFormatString = Settings.GetStr( "OutputFormatString", "[%ORIPATH%/]%ORIFN%[.%ORIEXT%][-%POSTFIX%][-%TGTI%][[-%MN%]|[-%MI%]][.%TGTEXT%]");
    let Type2 = Type;
    if ( Extra)
      Type2 = Extra;
    let Path = this.m_NamingTool.ComposeFileName( DayPath, Type2, 0, 4, -Count, "", Ext);
    let ret = CreateDirDeep( path.dirname( Path));
    // invariant( ret == 0);
    return Path;
  }

  ComposeFileName( Type, Ext, Extra = "")
  {
    // console.log( "ComposeFileName", Type, Ext);
    this.m_FileCount++;

    // due to screenshots on macosx, we end up with extramodel
    let OriginalFileName = path.basename( this.m_DayPath);
    let Extra1 = Extra.replace( OriginalFileName + " at ", "");

    let Path = this.ComposeFileName2( this.m_DayPath, this.m_FileCount, Type, Ext, Extra1);
    let ret = CreateDirDeep( path.dirname( Path));
    // KNVBase.invariant( ret == 0);
    return Path;
  }

  Reserve( Name)
  {
      this.m_ReservedName[ Name] = true;
  }

  Dereserve( Name)
  {
      this.m_ReservedName.removeAttr( Name);
  }
}
CTrayMin.Settings = Settings;
module.exports = CTrayMin;