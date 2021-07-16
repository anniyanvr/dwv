var dwv = dwv || {};
dwv.test = dwv.test || {};

// Image decoders (for web workers)
dwv.image.decoderScripts = {
  jpeg2000: '../../decoders/pdfjs/decode-jpeg2000.js',
  'jpeg-lossless': '../../decoders/rii-mango/decode-jpegloss.js',
  'jpeg-baseline': '../../decoders/pdfjs/decode-jpegbaseline.js',
  rle: '../../decoders/dwv/decode-rle.js'
};
// logger level (optional)
dwv.logger.level = dwv.utils.logger.levels.DEBUG;

var _app = null;

/**
 * Setup simple dwv app.
 */
dwv.test.viewerSetup = function () {
  // config
  var config = {
    containerDivId: 'dwv',
    tools: {
      Scroll: {},
      WindowLevel: {}
    }
  };
  // app
  _app = new dwv.App();
  _app.init(config);

  // bind events
  var isFirstRender = null;
  _app.addEventListener('error', function (event) {
    console.error('load error', event);
  });
  _app.addEventListener('loadstart', function () {
    console.time('load-data');
    isFirstRender = true;
  });
  _app.addEventListener('loadend', function () {
    console.timeEnd('load-data');
    console.log(_app.getMetaData());
  });
  _app.addEventListener('renderstart', function () {
    console.time('render-data');
  });
  _app.addEventListener('renderend', function () {
    console.timeEnd('render-data');
    if (isFirstRender) {
      isFirstRender = false;
      // select tool
      _app.setTool('Scroll');
    }
  });

  _app.addEventListener('keydown', function (event) {
    _app.defaultOnKeydown(event);
    if (event.keyCode === 83) { // s
      console.log('%c tool: scroll', 'color: teal;');
      _app.setTool('Scroll');
    } else if (event.keyCode === 87) { // w
      console.log('%c tool: windowlevel', 'color: teal;');
      _app.setTool('WindowLevel');
    }
  });

  // load from location
  dwv.utils.loadFromUri(window.location.href, _app);
};

/**
 * Last minute.
 */
dwv.test.onDOMContentLoadedViewer = function () {
  // setup
  dwv.test.viewerSetup();

  // bind app to input files
  const fileinput = document.getElementById('fileinput');
  fileinput.addEventListener('change', function (event) {
    console.log('%c ----------------', 'color: teal;');
    console.log(event.target.files);
    _app.loadFiles(event.target.files);
  });

  var alpharange = document.getElementById('alpharange');
  var alphanumber = document.getElementById('alphanumber');
  alpharange.oninput = function () {
    _app.setOpacity(this.value);
    alphanumber.value = this.value;
  };
  alphanumber.oninput = function () {
    _app.setOpacity(this.value);
    alpharange.value = this.value;
  };

};
