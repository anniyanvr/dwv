module.exports = function (grunt) {
  // copy target for dev deploy
  // call: yarn run dev --copy-target=../dwv-jqui
  var cpTarget = grunt.option('copy-target') || '../dwv-jqmobile';
  // karma ci test coverage
  var karmaCiReporters = ['progress'];
  if (grunt.option('coverage')) {
    karmaCiReporters.push('coverage');
  }
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      options: {
        configFile: '.eslint-full.js'
      },
      files: [
        'Gruntfile.js',
        'karma.conf.js',
        'src/**/*.js',
        'tests/**/*.js'
      ]
    },
    karma: {
      unit: {
        configFile: 'karma.conf.js',
        client: {
          qunit: {
            filter: grunt.option('filter')
          }
        }
      },
      ci: {
        configFile: 'karma.conf.js',
        browsers: ['ChromeHeadless'],
        reporters: karmaCiReporters,
        singleRun: true
      }
    },
    concat: {
      options: {
        banner: '/*!' +
          ' <%= pkg.name %> <%= pkg.version %>' +
          ' <%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %>' +
          ' */\n'
      },
      dist: {
        src: [
          'resources/module/intro.js',
          'src/**/*.js',
          'resources/module/outro.js'
        ],
        dest: 'build/dist/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '/*!' +
          ' <%= pkg.name %> <%= pkg.version %>' +
          ' <%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %>' +
          ' */\n'
      },
      dist: {
        files: {
          'build/dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    copy: {
      main: {
        files: [
          {
            src: 'build/dist/<%= pkg.name %>.js',
            dest: cpTarget + '/node_modules/dwv/dist/<%= pkg.name %>.js'
          },
          {
            src: 'build/dist/<%= pkg.name %>.js',
            dest: cpTarget + '/node_modules/dwv/dist/<%= pkg.name %>.min.js'
          }
        ]
      }
    },
    watch: {
      lint: {
        files: ['**/*.js', '!**/node_modules/**'],
        tasks: ['eslint'],
        options: {
          spawn: false,
          livereload: true
        }
      },
      build: {
        files: ['**/*.js', '!**/node_modules/**'],
        tasks: ['concat', 'copy'],
        options: {
          spawn: false
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-karma');

  // tasks
  grunt.registerTask('lint', ['eslint']);
  grunt.registerTask('test', ['karma:unit']);
  grunt.registerTask('test-ci', ['karma:ci']);
  grunt.registerTask('build', ['concat', 'uglify']);
  grunt.registerTask('dev', ['watch:build']);
};
