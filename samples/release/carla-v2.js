var carlaBotConfigs = {};

var carlaBot = (function () {

  var _chatContainer = document.createElement('div');
  var _chatWidget = document.createElement('div');
  var _fbRoot = document.createElement('div');
  var _minimizeButton = document.createElement('div');
  var _chatIframe = document.createElement('iframe');
  var botUrl;

  var __carlaChatBotStatesKeys = {
    LOCAL_STORAGE: '__kian_chat_state',
    OPENED: 'opened',
    COLLAPSED: 'collapsed',
    MINIMIZED: 'minimized',
  }

  // The app default which will handle the user invalid configs too
  var __carlaBotDefaults = {
    CHAT_CONTAINER_DEFAULT_WIDTH: 500,
    CHAT_CONTAINER_DEFAULT_OFFSET: 10,
    CHAT_CONTAINER_DEFAULT_HEIGHT: 500,
    CHAT_CONTAINER_DEFAULT_HIDDEN_HEIGHT: 0,
    CHAT_CONTAINER_DEFAULT_HEADER_HEIGHT: 40,
    CHAT_CONTAINER_DEFAULT_PLACEMENT: 'left',
    KIAN_CHAT_CONTAINER_DEFAULT_HEADER_TEXT: 'Chat with us',
    KIAN_CHAT_DEFAULT_WIDGET_TEXT: '^1000Need help?^2000 Ask me!^2000',
    KIAN_DEFAULT_CHAT_STATE: __carlaChatBotStatesKeys.COLLAPSED,
    CHAT_HEADER_BACKGROUND: '#c4172c',
  }

  // The chat state controller
  var __carlaBotStateController = (function () {
    var _currentState;

    function _isValidState(state) {
      return state && (state === __carlaChatBotStatesKeys.OPENED || state === __carlaChatBotStatesKeys.COLLAPSED || state === __carlaChatBotStatesKeys.MINIMIZED);
    }

    function setInitialState() {
      var configuredInitialState = carlaBotConfigs.CHAT_INITIAL_STATE;

      if (_isValidState(configuredInitialState)) {
        _currentState = configuredInitialState;
      }

      if (localStorage) {
        var localStorageState = localStorage.getItem(__carlaChatBotStatesKeys.LOCAL_STORAGE);

        if (_isValidState(localStorageState)) {
          _currentState = localStorageState;
        }
      }

      if (__carlaBotHelpers.isSmallScreen() || !_isValidState(_currentState)) {
        _currentState = __carlaBotDefaults.KIAN_DEFAULT_CHAT_STATE;
      }
    }

    function setState(state) {
      if (!_isValidState(state)) {
        return;
      }
      _currentState = state;
      if (localStorage) {
        localStorage.setItem(__carlaChatBotStatesKeys.LOCAL_STORAGE, state);
      }
    }

    function getState() {
      return _currentState;
    }

    return {
      setInitialState: setInitialState,
      setState: setState,
      getState: getState
    };

  })();

  // Carla bot helper functions
  var __carlaBotHelpers = (function () {
    var getChatHeight = function (whenOpened) {
      var visibleHeight = carlaBotConfigs.CHAT_CONTAINER_HEIGHT;
      // By default it is 0 but we assume that the user may want to see the chat header while the chat is collapsed (Not fully supported yet)
      var hiddenHeight = __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_HIDDEN_HEIGHT;
      var state = __carlaBotStateController.getState();
      var height;

      if (state === __carlaChatBotStatesKeys.OPENED || whenOpened) {
        if (!visibleHeight || isNaN(visibleHeight)) {
          visibleHeight = __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_HEIGHT;
        }
        height = visibleHeight;
      } else if (state === __carlaChatBotStatesKeys.MINIMIZED) {
        height = __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_HEADER_HEIGHT;
      } else {
        height = hiddenHeight;
      }
      return height + 'px';
    };

    var _getChatWidth = function () {
      var width = carlaBotConfigs.CHAT_CONTAINER_WIDTH;

      if (!width || isNaN(width)) {
        width = __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_WIDTH;
      }
      return width + 'px';
    };

    var _getChatWindowPlacement = function () {
      var offset = carlaBotConfigs.CHAT_CONTAINER_OFFSET;
      var placement = carlaBotConfigs.CHAT_CONTAINER_PLACEMENT;

      if (placement !== 'right' && placement !== 'left') {
        placement = __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_PLACEMENT
      }

      if (offset === undefined || isNaN(offset)) {
        offset = __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_OFFSET;
      }

      return placement + ':' + offset + 'px';
    };

    function createChatHeader() {
      var state = __carlaBotStateController.getState();
      var chatHeader = document.createElement('div');
      chatHeader.className = '__carla-chat-header';
      chatHeader.innerText = carlaBotConfigs.KIAN_CHAT_CONTAINER_HEADER_TEXT || __carlaBotDefaults.KIAN_CHAT_CONTAINER_DEFAULT_HEADER_TEXT;
      var backgroundColor = carlaBotConfigs.CHAT_HEADER_BACKGROUND || __carlaBotDefaults.CHAT_HEADER_BACKGROUND;
      var chatHeaderColor = 'background-color: ' + backgroundColor;
      var chatHeaderHeight = 'height: ' + __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_HEADER_HEIGHT + 'px';
      var chatHeaderStyle = chatHeaderHeight + ';' + chatHeaderColor;
      chatHeader.setAttribute('style', chatHeaderStyle);

      var closeButton = document.createElement('div');
      closeButton.className = 'close-button';
      chatHeader.appendChild(closeButton);

      var minimizeButtonclass = 'minimize-button';

      if (state === __carlaChatBotStatesKeys.MINIMIZED) {
        minimizeButtonclass += ' open';
      }

      // Needed for broader surface area for clicking
      var _minimizeButtonWrapper = document.createElement('div');
      _minimizeButtonWrapper.className = 'minimize-wrapper';

      _minimizeButton.className = minimizeButtonclass;
      _minimizeButtonWrapper.appendChild(_minimizeButton);
      chatHeader.appendChild(_minimizeButtonWrapper);

      closeButton.addEventListener('click', function (event) {
        __carlaEventHandlers.closeChat();
      });

      _minimizeButtonWrapper.addEventListener('click', function (event) {
        __carlaEventHandlers.minimizeChat();
      });

      return chatHeader;
    }

    function createIFrame() {
      _chatIframe.frameborder = 0;
      _chatIframe.src = botUrl;
      _chatIframe.className = '__carla-iframe';
      chatIframeStyle = 'height: ' + getChatHeight(true);
      _chatIframe.setAttribute('style', chatIframeStyle);
      _chatIframe.setAttribute('allow', 'geolocation');
      return _chatIframe;
    }

    function createChatContainer() {
      _chatContainer.className = '__carla-chat-container';
      var chatContainerStyle = [
        _getChatWindowPlacement(), 'width: ' + _getChatWidth(),
        'height: ' + getChatHeight()
      ].join(';');
      _chatContainer.setAttribute('style', chatContainerStyle);
      return _chatContainer;
    }

    function createChatWidget() {
      var placement = carlaBotConfigs.CHAT_CONTAINER_PLACEMENT;
      if (placement !== 'right' && placement !== 'left') {
        placement = __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_PLACEMENT
      }

      var state = __carlaBotStateController.getState();
      _chatWidget.className = [
        '__carla-chat-teaser',
        (placement === 'left') ? '__carla-chat-teaser--left' : '__carla-chat-teaser--right'
      ].join(" ");

      var isOpened = (state === __carlaChatBotStatesKeys.OPENED);
      var isMinimized = (state === __carlaChatBotStatesKeys.MINIMIZED);
      var displayValue = (isOpened || isMinimized) ? 'none' : 'block';


      chatWidgetStyle = ['display:' + displayValue].join(';');
      _chatWidget.setAttribute('style', chatWidgetStyle);

      var chatWidgetBubble = document.createElement('div');
      chatWidgetBubble.className = [
        'bubble',
        (placement === 'left') ? 'bubble--left' : 'bubble--right'
      ].join(' ');

      _chatWidget.appendChild(chatWidgetBubble);

      return _chatWidget;
    }

    function isSmallScreen() {
      return document.documentElement.clientWidth <= 768;
    }

    return {
      createChatContainer: createChatContainer,
      createChatWidget: createChatWidget,
      createChatHeader: createChatHeader,
      createIFrame: createIFrame,
      getChatHeight: getChatHeight,
      isSmallScreen: isSmallScreen,
    };

  })();

  // Carla bot event handlers
  var __carlaEventHandlers = (function () {
    var closeChat = function () {
      var currentState = __carlaBotStateController.getState();
      if (currentState === __carlaChatBotStatesKeys.OPENED || currentState === __carlaChatBotStatesKeys.MINIMIZED) {
        __carlaBotStateController.setState(__carlaChatBotStatesKeys.COLLAPSED);
        _chatContainer.style.height = __carlaBotHelpers.getChatHeight();
        _chatWidget.style.display = 'block';
      }
    };

    var openChat = function () {
      if (__carlaBotHelpers.isSmallScreen()) {
        window.open(botUrl);
        return;
      }
      if (!_chatContainer.contains(_chatIframe)) {
        _chatContainer.appendChild(_chatIframe);
      }
      __carlaBotStateController.setState(__carlaChatBotStatesKeys.OPENED);
      _minimizeButton.classList.remove("open");
      _chatWidget.style.display = 'none';
      _chatContainer.style.height = __carlaBotHelpers.getChatHeight();
    };

    var minimizeChat = function () {
      var currentState = __carlaBotStateController.getState();
      if (currentState === __carlaChatBotStatesKeys.MINIMIZED) {
        openChat();
      } else if (currentState === __carlaChatBotStatesKeys.OPENED) {
        _minimizeButton.classList.add("open");
        __carlaBotStateController.setState(__carlaChatBotStatesKeys.MINIMIZED);
        _chatContainer.style.height = __carlaBotHelpers.getChatHeight(); // __carlaBotDefaults.CHAT_CONTAINER_DEFAULT_HEADER_HEIGHT + 'px';
      }
    };

    var displayTeaser = function () {
      document
        .body
        .appendChild(_chatWidget);
      hideTeaserIfElementIsInView();
    }

    var displayBot = function () {
      if (document.body.contains(_chatWidget)) {
        return;
      }
      if (!__carlaBotHelpers.isSmallScreen()) {
        document
          .body
          .appendChild(_chatContainer);
      }
    }

    function onDocumentReady() {
      document.onreadystatechange = function () {
        if (document.readyState === 'complete') {
          displayBot();
          displayTeaser();
        }
      };
    }

    return {
      onDocumentReady: onDocumentReady,
      closeChat: closeChat,
      openChat: openChat,
      minimizeChat: minimizeChat,
      displayBot: displayBot
    };

  })();

  // Carla bot loading handler
  var __carlaBotLoaders = (function () {

    // var _loadFaceBookSDK = function () {
    //   (function(d, s, id){
    //     var js, fjs = d.getElementsByTagName(s)[0];
    //     if (d.getElementById(id)) return;
    //     js = d.createElement(s); js.id = id;
    //     js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
    //     fjs.parentNode.insertBefore(js, fjs);
    //   })(document, 'script', 'facebook-jssdk');
    // };

    var _chatToDisplay = function (chat) {
      switch (chat) {
        case "fb":
          _chatContainer.style.visibility = "hidden";
          _chatWidget.style.visibility = "hidden";
          _fbRoot.style.display = "block";
          break;

        case "web":
          _chatContainer.style.visibility = "visible";
          _chatWidget.style.visibility = "visible";
          _fbRoot.style.display = "none";
          break;

        case "none":
          _chatContainer.style.visibility = "hidden";
          _chatWidget.style.visibility = "hidden";
          _fbRoot.style.display = "none";
          break;

        default:
          _chatToDisplay("web");
      }
    };

    var initCarlaBot = function () {
      __carlaBotStateController.setInitialState();

      var _chatIFrame = __carlaBotHelpers.createIFrame();

      __carlaBotHelpers.createChatContainer();

      var chatHeader = __carlaBotHelpers.createChatHeader();
      _chatContainer.appendChild(chatHeader);


      if (__carlaBotStateController.getState() === __carlaChatBotStatesKeys.OPENED) {
        _chatContainer.appendChild(_chatIFrame);
      }

      __carlaBotHelpers.createChatWidget();

      setTimeout(() => {
        initBotTyping(carlaBotConfigs.KIAN_CHAT_WIDGET_TEXT || __carlaBotDefaults.KIAN_CHAT_DEFAULT_WIDGET_TEXT);
      }, 0);

      _chatWidget.addEventListener('click', function (event) {
        __carlaEventHandlers.openChat();
      });
    }

    var initFBChatPlugin = function (appId, fbPageId) {
      _chatToDisplay("web");
      return false;
      // if (!appId || !fbPageId) {
      //   _chatToDisplay("web");
      //   return false;
      // }

      // _loadFaceBookSDK();

      // _fbRoot.style.display = "none";
      // _fbRoot.id = "fb-root";
      // document.body.appendChild(_fbRoot);

      // var fbChatContainer = document.createElement('div');
      // fbChatContainer.className = 'fb-customerchat';
      // fbChatContainer.setAttribute('page_id', fbPageId);
      // fbChatContainer.setAttribute('theme_color', "#c4172c");
      // fbChatContainer.setAttribute('logged_in_greeting', __carlaBotDefaults.KIAN_CHAT_CONTAINER_DEFAULT_HEADER_TEXT);
      // _fbRoot.appendChild(fbChatContainer);

      //   // FB To Call This After It Has Loaded
      // window.fbAsyncInit = function() {
      //   FB.init({
      //       appId: appId,
      //       status: true,
      //       cookie: true,
      //       autoLogAppEvents: true,
      //       xfbml: true,
      //       version: 'v3.2'
      //   });
      //   FB.getLoginStatus(function(response) {
      //     if (response.status === 'connected') { // Logged In And Has Authorized App
      //       _chatToDisplay("fb");
      //     } else if (response.status === 'not_authorized') { // Logged In But Hasn't Authorized App
      //       FB.login();
      //     } else { // Not Logged In
      //       _chatToDisplay("web");
      //     }
      //   });

      //   // Subscribe To Authentication Events Especially After When User Gives Authorization To App
      //   FB.Event.subscribe('auth.statusChange', function(response) {
      //     if (response.status === 'connected') {
      //       _chatToDisplay("fb");
      //     } else {
      //       _chatToDisplay("web");
      //     }
      //   });

      // };

    };

    return {
      initCarlaBot: initCarlaBot,
      initFBChatPlugin: initFBChatPlugin
    };

  })();

  var initBot = function (botParams) {
    botUrl = botParams.botUrl;
    __carlaBotLoaders.initCarlaBot();
    __carlaBotLoaders.initFBChatPlugin(botParams.appId, botParams.fbPageId);
  }

  var displayBot = function (botParams) {
    initBot(botParams);
    __carlaEventHandlers.onDocumentReady();
  }

  var openChat = function () {
    __carlaEventHandlers.displayBot();
    __carlaEventHandlers.openChat();
  }


  function isInViewport (el) {
    var top = el.offsetTop;
    var left = el.offsetLeft;
    var width = el.offsetWidth;
    var height = el.offsetHeight;

    while(el.offsetParent) {
      el = el.offsetParent;
      top += el.offsetTop;
      left += el.offsetLeft;
    }

    return (
      top < (window.pageYOffset + window.innerHeight) &&
      left < (window.pageXOffset + window.innerWidth) &&
      (top + height) > window.pageYOffset &&
      (left + width) > window.pageXOffset
    );
  };

  function hideTeaserIfElementIsInView() {
    var elementToQuery = carlaBotConfigs.HIDE_TEASER_IF_ELEMENT_IN_VIEW;
    if(!elementToQuery){
      return false;
    }
    var element = document.querySelector(elementToQuery);
    if(isInViewport(element)){
      _chatWidget.style.visibility = "hidden";
      return false;
    }
    _chatWidget.style.visibility = "visible";
  }

  function throttle(fn, waitMs) {
    var time = Date.now();
    var lastScrollPosition = document.body.scrollTop || document.documentElement.scrollTop;
    return function() {
      var currentScrollPosition = document.body.scrollTop || document.documentElement.scrollTop;
      if (
          (time + waitMs - Date.now()) < 0 ||
          Math.abs(lastScrollPosition - currentScrollPosition) > 19
        ) {
        fn();
        time = Date.now();
        lastScrollPosition = currentScrollPosition;
      }
    }
  }

  window.addEventListener('scroll', throttle(hideTeaserIfElementIsInView, 1000));

  /* Please bear with the name mismatching it is done for backward compactibility
    The `init` bot now initializes and displays the bot
    While `load` just initializes the bot to be displayed when you open the chat
  */
  return {
    init: displayBot,
    load: initBot,
    openChat: openChat,
    closeChat: __carlaEventHandlers.closeChat,
  };


})();


function initBotTyping(introText) {
  /*!
 *
 *   typed.js - A JavaScript Typing Animation Library
 *   Author: Matt Boldt <me@mattboldt.com>
 *   Version: v2.0.8
 *   Url: https://github.com/mattboldt/typed.js
 *   License(s): MIT
 *
 */
  (function (t, e) { "object" == typeof exports && "object" == typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define([], e) : "object" == typeof exports ? exports.Typed = e() : t.Typed = e() })(this, function () { return function (t) { function e(n) { if (s[n]) return s[n].exports; var i = s[n] = { exports: {}, id: n, loaded: !1 }; return t[n].call(i.exports, i, i.exports, e), i.loaded = !0, i.exports } var s = {}; return e.m = t, e.c = s, e.p = "", e(0) }([function (t, e, s) { "use strict"; function n(t, e) { if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function") } Object.defineProperty(e, "__esModule", { value: !0 }); var i = function () { function t(t, e) { for (var s = 0; s < e.length; s++) { var n = e[s]; n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, n.key, n) } } return function (e, s, n) { return s && t(e.prototype, s), n && t(e, n), e } }(), r = s(1), o = s(3), a = function () { function t(e, s) { n(this, t), r.initializer.load(this, s, e), this.begin() } return i(t, [{ key: "toggle", value: function () { this.pause.status ? this.start() : this.stop() } }, { key: "stop", value: function () { this.typingComplete || this.pause.status || (this.toggleBlinking(!0), this.pause.status = !0, this.options.onStop(this.arrayPos, this)) } }, { key: "start", value: function () { this.typingComplete || this.pause.status && (this.pause.status = !1, this.pause.typewrite ? this.typewrite(this.pause.curString, this.pause.curStrPos) : this.backspace(this.pause.curString, this.pause.curStrPos), this.options.onStart(this.arrayPos, this)) } }, { key: "destroy", value: function () { this.reset(!1), this.options.onDestroy(this) } }, { key: "reset", value: function () { var t = arguments.length <= 0 || void 0 === arguments[0] || arguments[0]; clearInterval(this.timeout), this.replaceText(""), this.cursor && this.cursor.parentNode && (this.cursor.parentNode.removeChild(this.cursor), this.cursor = null), this.strPos = 0, this.arrayPos = 0, this.curLoop = 0, t && (this.insertCursor(), this.options.onReset(this), this.begin()) } }, { key: "begin", value: function () { var t = this; this.typingComplete = !1, this.shuffleStringsIfNeeded(this), this.insertCursor(), this.bindInputFocusEvents && this.bindFocusEvents(), this.timeout = setTimeout(function () { t.currentElContent && 0 !== t.currentElContent.length ? t.backspace(t.currentElContent, t.currentElContent.length) : t.typewrite(t.strings[t.sequence[t.arrayPos]], t.strPos) }, this.startDelay) } }, { key: "typewrite", value: function (t, e) { var s = this; this.fadeOut && this.el.classList.contains(this.fadeOutClass) && (this.el.classList.remove(this.fadeOutClass), this.cursor && this.cursor.classList.remove(this.fadeOutClass)); var n = this.humanizer(this.typeSpeed), i = 1; return this.pause.status === !0 ? void this.setPauseStatus(t, e, !0) : void (this.timeout = setTimeout(function () { e = o.htmlParser.typeHtmlChars(t, e, s); var n = 0, r = t.substr(e); if ("^" === r.charAt(0) && /^\^\d+/.test(r)) { var a = 1; r = /\d+/.exec(r)[0], a += r.length, n = parseInt(r), s.temporaryPause = !0, s.options.onTypingPaused(s.arrayPos, s), t = t.substring(0, e) + t.substring(e + a), s.toggleBlinking(!0) } if ("`" === r.charAt(0)) { for (; "`" !== t.substr(e + i).charAt(0) && (i++ , !(e + i > t.length));); var u = t.substring(0, e), l = t.substring(u.length + 1, e + i), c = t.substring(e + i + 1); t = u + l + c, i-- } s.timeout = setTimeout(function () { s.toggleBlinking(!1), e === t.length ? s.doneTyping(t, e) : s.keepTyping(t, e, i), s.temporaryPause && (s.temporaryPause = !1, s.options.onTypingResumed(s.arrayPos, s)) }, n) }, n)) } }, { key: "keepTyping", value: function (t, e, s) { 0 === e && (this.toggleBlinking(!1), this.options.preStringTyped(this.arrayPos, this)), e += s; var n = t.substr(0, e); this.replaceText(n), this.typewrite(t, e) } }, { key: "doneTyping", value: function (t, e) { var s = this; this.options.onStringTyped(this.arrayPos, this), this.toggleBlinking(!0), this.arrayPos === this.strings.length - 1 && (this.complete(), this.loop === !1 || this.curLoop === this.loopCount) || (this.timeout = setTimeout(function () { s.backspace(t, e) }, this.backDelay)) } }, { key: "backspace", value: function (t, e) { var s = this; if (this.pause.status === !0) return void this.setPauseStatus(t, e, !0); if (this.fadeOut) return this.initFadeOut(); this.toggleBlinking(!1); var n = this.humanizer(this.backSpeed); this.timeout = setTimeout(function () { e = o.htmlParser.backSpaceHtmlChars(t, e, s); var n = t.substr(0, e); if (s.replaceText(n), s.smartBackspace) { var i = s.strings[s.arrayPos + 1]; i && n === i.substr(0, e) ? s.stopNum = e : s.stopNum = 0 } e > s.stopNum ? (e-- , s.backspace(t, e)) : e <= s.stopNum && (s.arrayPos++ , s.arrayPos === s.strings.length ? (s.arrayPos = 0, s.options.onLastStringBackspaced(), s.shuffleStringsIfNeeded(), s.begin()) : s.typewrite(s.strings[s.sequence[s.arrayPos]], e)) }, n) } }, { key: "complete", value: function () { this.options.onComplete(this), this.loop ? this.curLoop++ : this.typingComplete = !0 } }, { key: "setPauseStatus", value: function (t, e, s) { this.pause.typewrite = s, this.pause.curString = t, this.pause.curStrPos = e } }, { key: "toggleBlinking", value: function (t) { this.cursor && (this.pause.status || this.cursorBlinking !== t && (this.cursorBlinking = t, t ? this.cursor.classList.add("typed-cursor--blink") : this.cursor.classList.remove("typed-cursor--blink"))) } }, { key: "humanizer", value: function (t) { return Math.round(Math.random() * t / 2) + t } }, { key: "shuffleStringsIfNeeded", value: function () { this.shuffle && (this.sequence = this.sequence.sort(function () { return Math.random() - .5 })) } }, { key: "initFadeOut", value: function () { var t = this; return this.el.className += " " + this.fadeOutClass, this.cursor && (this.cursor.className += " " + this.fadeOutClass), setTimeout(function () { t.arrayPos++ , t.replaceText(""), t.strings.length > t.arrayPos ? t.typewrite(t.strings[t.sequence[t.arrayPos]], 0) : (t.typewrite(t.strings[0], 0), t.arrayPos = 0) }, this.fadeOutDelay) } }, { key: "replaceText", value: function (t) { this.attr ? this.el.setAttribute(this.attr, t) : this.isInput ? this.el.value = t : "html" === this.contentType ? this.el.innerHTML = t : this.el.textContent = t } }, { key: "bindFocusEvents", value: function () { var t = this; this.isInput && (this.el.addEventListener("focus", function (e) { t.stop() }), this.el.addEventListener("blur", function (e) { t.el.value && 0 !== t.el.value.length || t.start() })) } }, { key: "insertCursor", value: function () { this.showCursor && (this.cursor || (this.cursor = document.createElement("span"), this.cursor.className = "typed-cursor", this.cursor.innerHTML = this.cursorChar, this.el.parentNode && this.el.parentNode.insertBefore(this.cursor, this.el.nextSibling))) } }]), t }(); e["default"] = a, t.exports = e["default"] }, function (t, e, s) { "use strict"; function n(t) { return t && t.__esModule ? t : { "default": t } } function i(t, e) { if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function") } Object.defineProperty(e, "__esModule", { value: !0 }); var r = Object.assign || function (t) { for (var e = 1; e < arguments.length; e++) { var s = arguments[e]; for (var n in s) Object.prototype.hasOwnProperty.call(s, n) && (t[n] = s[n]) } return t }, o = function () { function t(t, e) { for (var s = 0; s < e.length; s++) { var n = e[s]; n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, n.key, n) } } return function (e, s, n) { return s && t(e.prototype, s), n && t(e, n), e } }(), a = s(2), u = n(a), l = function () { function t() { i(this, t) } return o(t, [{ key: "load", value: function (t, e, s) { if ("string" == typeof s ? t.el = document.querySelector(s) : t.el = s, t.options = r({}, u["default"], e), t.isInput = "input" === t.el.tagName.toLowerCase(), t.attr = t.options.attr, t.bindInputFocusEvents = t.options.bindInputFocusEvents, t.showCursor = !t.isInput && t.options.showCursor, t.cursorChar = t.options.cursorChar, t.cursorBlinking = !0, t.elContent = t.attr ? t.el.getAttribute(t.attr) : t.el.textContent, t.contentType = t.options.contentType, t.typeSpeed = t.options.typeSpeed, t.startDelay = t.options.startDelay, t.backSpeed = t.options.backSpeed, t.smartBackspace = t.options.smartBackspace, t.backDelay = t.options.backDelay, t.fadeOut = t.options.fadeOut, t.fadeOutClass = t.options.fadeOutClass, t.fadeOutDelay = t.options.fadeOutDelay, t.isPaused = !1, t.strings = t.options.strings.map(function (t) { return t.trim() }), "string" == typeof t.options.stringsElement ? t.stringsElement = document.querySelector(t.options.stringsElement) : t.stringsElement = t.options.stringsElement, t.stringsElement) { t.strings = [], t.stringsElement.style.display = "none"; var n = Array.prototype.slice.apply(t.stringsElement.children), i = n.length; if (i) for (var o = 0; o < i; o += 1) { var a = n[o]; t.strings.push(a.innerHTML.trim()) } } t.strPos = 0, t.arrayPos = 0, t.stopNum = 0, t.loop = t.options.loop, t.loopCount = t.options.loopCount, t.curLoop = 0, t.shuffle = t.options.shuffle, t.sequence = [], t.pause = { status: !1, typewrite: !0, curString: "", curStrPos: 0 }, t.typingComplete = !1; for (var o in t.strings) t.sequence[o] = o; t.currentElContent = this.getCurrentElContent(t), t.autoInsertCss = t.options.autoInsertCss, this.appendAnimationCss(t) } }, { key: "getCurrentElContent", value: function (t) { var e = ""; return e = t.attr ? t.el.getAttribute(t.attr) : t.isInput ? t.el.value : "html" === t.contentType ? t.el.innerHTML : t.el.textContent } }, { key: "appendAnimationCss", value: function (t) { var e = "data-typed-js-css"; if (t.autoInsertCss && (t.showCursor || t.fadeOut) && !document.querySelector("[" + e + "]")) { var s = document.createElement("style"); s.type = "text/css", s.setAttribute(e, !0); var n = ""; t.showCursor && (n += "\n        .typed-cursor{\n          opacity: 1;\n        }\n        .typed-cursor.typed-cursor--blink{\n          animation: typedjsBlink 0.7s infinite;\n          -webkit-animation: typedjsBlink 0.7s infinite;\n                  animation: typedjsBlink 0.7s infinite;\n        }\n        @keyframes typedjsBlink{\n          50% { opacity: 0.0; }\n        }\n        @-webkit-keyframes typedjsBlink{\n          0% { opacity: 1; }\n          50% { opacity: 0.0; }\n          100% { opacity: 1; }\n        }\n      "), t.fadeOut && (n += "\n        .typed-fade-out{\n          opacity: 0;\n          transition: opacity .25s;\n        }\n        .typed-cursor.typed-cursor--blink.typed-fade-out{\n          -webkit-animation: 0;\n          animation: 0;\n        }\n      "), 0 !== s.length && (s.innerHTML = n, document.body.appendChild(s)) } } }]), t }(); e["default"] = l; var c = new l; e.initializer = c }, function (t, e) { "use strict"; Object.defineProperty(e, "__esModule", { value: !0 }); var s = { strings: ["These are the default values...", "You know what you should do?", "Use your own!", "Have a great day!"], stringsElement: null, typeSpeed: 0, startDelay: 0, backSpeed: 0, smartBackspace: !0, shuffle: !1, backDelay: 700, fadeOut: !1, fadeOutClass: "typed-fade-out", fadeOutDelay: 500, loop: !1, loopCount: 1 / 0, showCursor: !0, cursorChar: "|", autoInsertCss: !0, attr: null, bindInputFocusEvents: !1, contentType: "html", onComplete: function (t) { }, preStringTyped: function (t, e) { }, onStringTyped: function (t, e) { }, onLastStringBackspaced: function (t) { }, onTypingPaused: function (t, e) { }, onTypingResumed: function (t, e) { }, onReset: function (t) { }, onStop: function (t, e) { }, onStart: function (t, e) { }, onDestroy: function (t) { } }; e["default"] = s, t.exports = e["default"] }, function (t, e) { "use strict"; function s(t, e) { if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function") } Object.defineProperty(e, "__esModule", { value: !0 }); var n = function () { function t(t, e) { for (var s = 0; s < e.length; s++) { var n = e[s]; n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, n.key, n) } } return function (e, s, n) { return s && t(e.prototype, s), n && t(e, n), e } }(), i = function () { function t() { s(this, t) } return n(t, [{ key: "typeHtmlChars", value: function (t, e, s) { if ("html" !== s.contentType) return e; var n = t.substr(e).charAt(0); if ("<" === n || "&" === n) { var i = ""; for (i = "<" === n ? ">" : ";"; t.substr(e + 1).charAt(0) !== i && (e++ , !(e + 1 > t.length));); e++ } return e } }, { key: "backSpaceHtmlChars", value: function (t, e, s) { if ("html" !== s.contentType) return e; var n = t.substr(e).charAt(0); if (">" === n || ";" === n) { var i = ""; for (i = ">" === n ? "<" : "&"; t.substr(e - 1).charAt(0) !== i && (e-- , !(e < 0));); e-- } return e } }]), t }(); e["default"] = i; var r = new i; e.htmlParser = r }]) });
  //# sourceMappingURL=typed.min.js.map
  function botIntro() {
    var type = new Typed(".bubble", {
      strings: [
        introText
      ],
      startDelay: 0000,
      smartBackspace: false,
      showCursor: false,
      typeSpeed: 20,
      backSpeed: 15,
      preStringTyped: function (arrayPos, self) {
        var avatarTextEl = document.getElementsByClassName("bubble")[0];
        avatarTextEl.style.display = "initial";
      },
      onComplete: function (self) {
        var avatarTextEl = document.getElementsByClassName("bubble")[0];
        //avatarTextEl.style.display = "none";
      },
    })
  }
  botIntro();
};
