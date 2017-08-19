(function app(){

  //
  // Console
  //

  var browser = document.getElementById("browser"),
      titleBar = document.getElementsByClassName("window-title")[0],
      titleBarH = 26,
      userEvent = document.ontouchend ? "touchend" : "click",
      doc = document.getElementById("doc"),
      docWin = doc.contentWindow.document || doc.contentDocument,
      docTitle = document.getElementById("doc_title"),
      docUrl = document.getElementById("doc_url"),
      maximized = false,
      minimized = false,
      backBtn = document.getElementById("back"),
      fwdBtn = document.getElementById("forward"),

      termout = document.getElementById('termout'),
      commandEl = document.getElementById('commands'),
      helpContent = document.getElementById('helpContent'),
      curPre,
      curType,
      group = '',
      wasNewline = false,
      appDir = '/app',
      socket = io(),
      packageJSON = {},
      
      //
      // Document Browser
      //

      bindBrowser = function() {
        // capture keys
        document.onkeydown = checkKey;
        
        // register events
        var eleEvents = [
            ["maximize", maximize],
            ["minimize", minimize],
            ["close", closeWin],
            ["back", goBack],
            ["forward", goForward],
            ["refresh", refreshDoc],
            ["home", goHome],
            ["print", printDoc],
            ["help", showHelp],
            ["open", openTab],
            ["fido", openFido]
          ];
        
        // add all event listeners for userEvent (touchend or click)
        for (var i = 0; i < eleEvents.length; ++i) {
          document.getElementById(eleEvents[i][0]).addEventListener(userEvent, eleEvents[i][1]);
        }

        // when iframe loads
        doc.onload = function(){
          docWin = doc.contentWindow.document || doc.contentDocument;
          docTitle.value = docWin.title;
          docUrl.value = docWin.location.href;
        };

        checkHistory();
      },
      // choose when to disable back and forward buttons
      checkHistory = function() {
        backBtn.disabled = true;
        fwdBtn.disabled = true;
      },
      reset = function() {
        minimized = false;
        maximized = false;
        document.body.className = "";
      },
      minimize = function() {
        if (minimized) {
          reset();
        } else {
          reset();
          minimized = true;
          document.body.className = "minimized";
        }
      },
      maximize = function() {
        if (maximized) {
          reset();
        } else {
          reset();
          document.body.className = "maximized";
          maximized = true;
        }
      },
      closeWin = function() {
        docUrl.value = "",
        browser.style.display = "none";
      },
      goBack = function() {
        alert( 'History is not implemented yet' );
      },
      goForward = function() {
        alert( 'History is not implemented yet' );
      },
      refreshDoc = function() {
        var loc = doc.contentWindow.location.href;
        doc.src = "";
        doc.src = loc;
        docUrl.value = loc;
      },
      printDoc = function() {
        console.log(doc.contentWindow.window.docObject);
        log('docObject for ' + docWin.location.href, 'command');
        log("\n" + JSON.stringify(doc.contentWindow.window.docObject, null, 2) + "\n", 'object');
      },
      goHome = function() {
        doc.src = "";
        doc.src = appDir;
      },
      // move help to bottom in console
      showHelp = function() {
        termout.appendChild(helpContent);
        scrollDown(true);
      },
      openTab = function() {
        window.open(doc.src);
      },
      openFido = function() {
        window.open('https://github.com/fidojs');
      },
      // capture enter event
      checkKey = function(e) {
        e = e || window.event;
        if (e.keyCode == '13' && docUrl.value != "") {
          doc.src = docUrl.value;
          docUrl.value = doc.src;
          return false;
        }
      },

      //
      // Terminal
      //

      bindTerminal = function() {
        // log socket data
        socket.on('stdout', function (data) {
          log(decode(data), 'stdout');
        });
        socket.on('stderr', function (data) {
          log(decode(data), 'stderr');
        });
        socket.on('command', function (data) {
          log(data, 'command');
        });
        socket.on('command-error', function (data) {
          log(data, 'stderr');
        });

        // package configuration
        socket.on('package-json', function (data) {
          packageJSON = data;

          if ( packageJSON.hasOwnProperty('scripts') ) {
            setupHelp(Object.keys(packageJSON.scripts));
          }
        });

        // route configuration
        socket.on('dist-route', function (newAppDir) {
          if (newAppDir !== appDir) {
            appDir = newAppDir;
            doc.src = "";
            doc.src = appDir;
          }
        });

        // one-time message about Glitch settings
        socket.on('project-domain', function (data) {
          var replace = '(?:(?:^|.*;\\s*)' + data + '\\s*\\=\\s*([^;]*).*$)|^.*$';
          var re = new RegExp(replace);
          if (document.cookie.replace(re, "$1") !== "true") {
            alert('Make sure you disable "Refresh App on Changes" in Glitch settings!');
            document.cookie = data + '=true; expires=Fri, 31 Dec 9999 23:59:59 GMT';
          }
          // @TODO(leoj3n): Set a password cookie for command running.
        });
      },
      scrollDown = function(force) {
        var div = termout.parentNode;
        if (force || (div.scrollTop >= (div.scrollHeight - div.offsetHeight - 100)) ) {
          div.scrollTop = div.scrollHeight;
        }
      },
      setupHelp = function(scripts) {
        // filter out native npm commmands; these should be automated by the
        // backend, and not triggered from the frontend.
        var commands = scripts.filter(function(key) {
          return !(['prepublish', 'prepare', 'prepublishOnly', 'prepack',
                   'postpack', 'publish', 'preinstall', 'install',
                   'preuninstall', 'postuninstall', 'preversion', 'version',
                   'postversion', 'pretest', 'test', 'posttest', 'prestop',
                   'stop', 'poststop', 'prestart', 'start', 'poststart',
                   'prerestart', 'restart', 'postrestart', 'preshrinkwrap',
                   'shrinkwrap', 'postshrinkwrap'].indexOf(key) > -1);
          });

        commandEl.innerHTML = '';

        if (commands.length > 0) {
          commandEl.appendChild(document.createTextNode('npm run: '));
        }

        for (var i = 0; i < commands.length; i++) {
          var a = document.createElement('A');
          a.dataset.command = commands[i];
          a.addEventListener(userEvent, npmRunCommand);
          a.appendChild(document.createTextNode(commands[i]));
          commandEl.appendChild(a);
          if (i < (commands.length - 1)) {
            commandEl.appendChild(document.createTextNode(' | '));
          }
        }
      },
      npmRunCommand = function(command) {
        socket.emit('npm-run', { task: command.target.dataset.command });
      },
      decode = function(data) {
        var dataView = new DataView(data);
        var decoder = new TextDecoder('utf-8');
        var decodedString = decoder.decode(dataView);
        return decodedString;
      },
      setGroup = function() {
        var text = curPre.textContent;

        if (/^BUILD:/.test(text)) {
          group = 'group-build';
        } else if(group === 'group-build') {
          group = '';
        }

        if (/^PROCESSING:/.test(text)) {
          group = 'group-processing';
        } else if(group === 'group-processing') {
          group = '';
        }

        if (/^OUT:/.test(text)) {
          group = 'group-out';
        } else if(group === 'group-out') {
          group = '';
        }

        if (/^OPENING:/.test(text)) {
          group = 'group-opening';
        } else if(group === 'group-opening') {
          group = '';
        }

        if (/^BUNDLE:/.test(text)) {
          group = 'group-bundle';
        } else if(group === 'group-bundle') {
          group = '';
        }

        if (/^npm info/.test(text) || /^npm http/.test(text)) {
          group = 'group-npm';
        } else if(group === 'group-npm') {
          group = '';
        }
        
        if (text === "\n") {
          group = 'group-newline';
        } else if(group === 'group-newline') {
          group = '';
        }

        curPre.className = curType + ' ' + group;
      },
      newPre = function() {
        curPre = document.createElement('PRE');
        curPre.className = curType + ' ' + group;
        termout.appendChild(curPre);
        scrollDown();
      },
      log = function(msg, type) {
        var lines = msg.split(/\r?\n/g);

        if (curType !== type) {
          curType = type;
          newPre();
          wasNewline = false;
        } 

        for (var i = 0; i < lines.length; i++) {
          var text = lines[i];
          var save = text;

          if (text === "") {
            text = "\n";
            if (wasNewline) {
              newPre();
            }
            wasNewline = true;
          } else if (wasNewline || i > 0) {
            newPre();
            wasNewline = false;
          }

          curPre.appendChild(document.createTextNode(text));
          setGroup();
        }
      };

  bindBrowser();
  bindTerminal();
  
})();
