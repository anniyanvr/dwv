// namespace
var dwv = dwv || {};
dwv.test = dwv.test || {};

/**
 * Tests for the 'dicom/dicomWriter.js' file.
 */
// Do not warn if these variables were not defined before.
/* global QUnit */
QUnit.module('dicomWriter');

/**
 * Tests for {@link dwv.dicom.DicomWriter} using simple DICOM data.
 * Using remote file for CI integration.
 *
 * @function module:tests/dicom~dicomWriterSimpleDicom
 */
QUnit.test('Test multiframe writer support.', function (assert) {
  var done = assert.async();

  var request = new XMLHttpRequest();
  var url = '/tests/data/multiframe-test1.dcm';
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onerror = function (event) {
    console.log(event);
  };
  request.onload = function (/*event*/) {
    assert.ok((this.response.byteLength !== 0), 'Got a response.');

    // parse DICOM
    var dicomParser = new dwv.dicom.DicomParser();
    dicomParser.parse(this.response);

    var numCols = 256;
    var numRows = 256;
    var numFrames = 16;
    var bufferSize = numCols * numRows * numFrames;

    // raw tags
    var rawTags = dicomParser.getRawDicomElements();
    // check values
    assert.equal(rawTags.x00280008.value[0], numFrames, 'Number of frames');
    assert.equal(rawTags.x00280011.value[0], numCols, 'Number of columns');
    assert.equal(rawTags.x00280010.value[0], numRows, 'Number of rows');
    // length of value array for pixel data
    assert.equal(
      rawTags.x7FE00010.value[0].length,
      bufferSize,
      'Length of value array for pixel data');

    var dicomWriter = new dwv.dicom.DicomWriter();
    var buffer = dicomWriter.getBuffer(rawTags);

    dicomParser = new dwv.dicom.DicomParser();
    dicomParser.parse(buffer);

    rawTags = dicomParser.getRawDicomElements();

    // check values
    assert.equal(rawTags.x00280008.value[0], numFrames, 'Number of frames');
    assert.equal(rawTags.x00280011.value[0], numCols, 'Number of columns');
    assert.equal(rawTags.x00280010.value[0], numRows, 'Number of rows');
    // length of value array for pixel data
    assert.equal(
      rawTags.x7FE00010.value[0].length,
      bufferSize,
      'Length of value array for pixel data');

    // finish async test
    done();
  };
  request.send(null);
});

/**
 * Tests for {@link dwv.dicom.DicomWriter} anomnymisation.
 * Using remote file for CI integration.
 *
 * @function module:tests/dicom~dicomWriterAnonymise
 */
QUnit.test('Test patient anonymisation', function (assert) {
  var done = assert.async();

  var request = new XMLHttpRequest();
  var url = '/tests/data/dwv-test-anonymise.dcm';
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onerror = function (event) {
    console.log(event);
  };
  request.onload = function (/*event*/) {
    assert.ok((this.response.byteLength !== 0), 'Got a response.');

    // parse DICOM
    var dicomParser = new dwv.dicom.DicomParser();
    dicomParser.parse(this.response);

    var patientsNameAnonymised = 'anonymise-name';
    var patientsIdAnonymised = 'anonymise-id';
    // rules with different levels: full tag, tag name and group name
    var rules = {
      default: {
        action: 'copy', value: null
      },
      x00100010: {
        action: 'replace', value: patientsNameAnonymised
      },
      PatientID: {
        action: 'replace', value: patientsIdAnonymised
      },
      Patient: {
        action: 'remove', value: null
      }
    };

    var patientsName = 'dwv-patient-test';
    var patientID = 'dwv-patient-id123';
    var patientsBirthDate = '19830101';
    var patientsSex = 'M';

    // raw tags
    var rawTags = dicomParser.getRawDicomElements();
    // check values
    assert.equal(
      rawTags.x00100010.value[0].trim(),
      patientsName,
      'patientsName');
    assert.equal(
      rawTags.x00100020.value[0].trim(),
      patientID,
      'patientID');
    assert.equal(
      rawTags.x00100030.value[0].trim(),
      patientsBirthDate,
      'patientsBirthDate');
    assert.equal(
      rawTags.x00100040.value[0].trim(),
      patientsSex,
      'patientsSex');

    var dicomWriter = new dwv.dicom.DicomWriter();
    dicomWriter.rules = rules;
    var buffer = dicomWriter.getBuffer(rawTags);

    dicomParser = new dwv.dicom.DicomParser();

    dicomParser.parse(buffer);

    rawTags = dicomParser.getRawDicomElements();

    // check values
    assert.equal(
      rawTags.x00100010.value[0],
      patientsNameAnonymised,
      'patientName');
    assert.equal(
      rawTags.x00100020.value[0],
      patientsIdAnonymised,
      'patientID');
    assert.notOk(rawTags.x00100030, 'patientsBirthDate');
    assert.notOk(rawTags.x00100040, 'patientsSex');

    // finish async test
    done();
  };
  request.send(null);
});

/**
 * Get a string representation of an object.
 * TypedArray.toString can return '[object Uint8Array]' on old browsers
 * (such as in PhantomJs).
 *
 * @param {object} obj The input object
 * @returns {string} The string.
 */
dwv.test.toString = function (obj) {
  var res = obj.toString();
  if (res.substr(0, 7) === '[object' &&
        res.substr((res.length - 6), 6) === 'Array]') {
    res = '';
    for (var i = 0; i < obj.length; ++i) {
      res += obj[i];
      if (i !== obj.length - 1) {
        res += ',';
      }
    }
  }
  return res;
};

/**
 * Compare JSON tags and DICOM elements
 *
 * @param {object} jsonTags The JSON tags.
 * @param {object} dicomElements The DICOM elements
 * @param {string} name The name of the test.
 * @param {object} comparator An object with an equal function (such as
 *   Qunit assert).
 */
dwv.test.compare = function (jsonTags, dicomElements, name, comparator) {
  // check content
  if (jsonTags === null || jsonTags === 0) {
    return;
  }
  var keys = Object.keys(jsonTags);
  for (var k = 0; k < keys.length; ++k) {
    var tagName = keys[k];
    var tag = dwv.dicom.getTagFromDictionary(tagName);
    var tagKey = tag.getKey();
    var element = dicomElements.getDEFromKey(tagKey);
    var value = dicomElements.getFromKey(tagKey, true);
    if (element.vr !== 'SQ') {
      comparator.equal(
        dwv.test.toString(value),
        jsonTags[tagName],
        name + ' - ' + tagName);
    } else {
      // check content
      if (jsonTags[tagName] === null || jsonTags[tagName] === 0) {
        continue;
      }
      // supposing same order of subkeys and indices...
      var subKeys = Object.keys(jsonTags[tagName]);
      var index = 0;
      for (var sk = 0; sk < subKeys.length; ++sk) {
        if (subKeys[sk] !== 'explicitLength') {
          var wrap = new dwv.dicom.DicomElementsWrapper(value[index]);
          dwv.test.compare(
            jsonTags[tagName][subKeys[sk]], wrap, name, comparator);
          ++index;
        }
      }
    }
  }
};

/**
 * Test a JSON config: write a DICOM file and read it back.
 *
 * @param {object} config A JSON config representing DICOM tags.
 * @param {object} assert A Qunit assert.
 */
dwv.test.testWriteReadDataFromConfig = function (config, assert) {
  // add private tags to dict if present
  var useUnVrForPrivateSq = false;
  if (typeof config.privateDictionary !== 'undefined') {
    var keys = Object.keys(config.privateDictionary);
    for (var i = 0; i < keys.length; ++i) {
      var group = keys[i];
      var tags = config.privateDictionary[group];
      dwv.dicom.dictionary[group] = tags;
    }
    if (typeof config.useUnVrForPrivateSq !== 'undefined') {
      useUnVrForPrivateSq = config.useUnVrForPrivateSq;
    }
  }
  // convert JSON to DICOM element object
  var res = dwv.dicom.getElementsFromJSONTags(config.tags);
  var dicomElements = res.elements;
  // pixels: small gradient square
  dicomElements.x7FE00010 =
    dwv.dicom.generatePixelDataFromJSONTags(config.tags, res.offset);

  // create DICOM buffer
  var writer = new dwv.dicom.DicomWriter();
  writer.useUnVrForPrivateSq = useUnVrForPrivateSq;
  var dicomBuffer = null;
  try {
    dicomBuffer = writer.getBuffer(dicomElements);
  } catch (error) {
    assert.ok(false, 'Caught error: ' + error);
    return;
  }

  // parse the buffer
  var dicomParser = new dwv.dicom.DicomParser();
  dicomParser.parse(dicomBuffer);
  var elements = dicomParser.getDicomElements();

  // compare contents
  dwv.test.compare(config.tags, elements, config.name, assert);
};

/**
 * Tests write/read DICOM data from config file: explicit encoding.
 * Using remote file for CI integration.
 *
 * @function module:tests/dicom~dicomExplicitWriteReadFromConfig
 */
QUnit.test('Test synthetic dicom explicit', function (assert) {
  var done = assert.async();

  // get the list of configs
  var request = new XMLHttpRequest();
  var url = '/tests/dicom/synthetic-data_explicit.json';
  request.open('GET', url, true);
  request.onerror = function (event) {
    console.error(event);
  };
  request.onload = function (/*event*/) {
    var configs = JSON.parse(this.responseText);
    for (var i = 0; i < configs.length; ++i) {
      dwv.test.testWriteReadDataFromConfig(configs[i], assert);
    }
    // finish async test
    done();
  };
  request.send(null);
});

/**
 * Tests write/read DICOM data from config file: implicit encoding.
 * Using remote file for CI integration.
 *
 * @function module:tests/dicom~dicomImplicitWriteReadFromConfig
 */
QUnit.test('Test synthetic dicom implicit', function (assert) {
  var done = assert.async();

  // get the list of configs
  var request = new XMLHttpRequest();
  var url = '/tests/dicom/synthetic-data_implicit.json';
  request.open('GET', url, true);
  request.onerror = function (event) {
    console.error(event);
  };
  request.onload = function (/*event*/) {
    var configs = JSON.parse(this.responseText);
    for (var i = 0; i < configs.length; ++i) {
      dwv.test.testWriteReadDataFromConfig(configs[i], assert);
    }
    // finish async test
    done();
  };
  request.send(null);
});

/**
 * Tests write/read DICOM data from config file: explicit big endian encoding.
 * Using remote file for CI integration.
 *
 * @function module:tests/dicom~dicomExplicitBigEndianWriteReadFromConfig
 */
QUnit.test('Test synthetic dicom explicit big endian', function (assert) {
  var done = assert.async();

  // get the list of configs
  var request = new XMLHttpRequest();
  var url = '/tests/dicom/synthetic-data_explicit_big-endian.json';
  request.open('GET', url, true);
  request.onerror = function (event) {
    console.error(event);
  };
  request.onload = function (/*event*/) {
    var configs = JSON.parse(this.responseText);
    for (var i = 0; i < configs.length; ++i) {
      dwv.test.testWriteReadDataFromConfig(configs[i], assert);
    }
    // finish async test
    done();
  };
  request.send(null);
});
