module.exports = (grunt) => {

    grunt.file.setBase('..');
    // eslint-disable-next-line import/no-extraneous-dependencies
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        clean: {},
        express: {
            dev: {
                options: {
                    script: 'app/index.js',
                    node_env: 'dev',
                    port: process.env.PORT,
                    output: 'started'
                }
            }
        },

        mochaTest: {
            e2e: {
                options: {
                    reporter: 'spec',
                    quiet: false, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: true, // Optionally clear the require cache before running tests (defaults to false)
                },
                src: ['app/test/e2e/**/*.spec.js']
            }
        },
        watch: {
            options: {
                livereload: 35730
            },
            e2eTest: {
                files: [
                    'app/test/e2e/**/*.spec.js',
                ],
                tasks: ['mochaTest:e2e'],
                options: {
                    spawn: true
                }
            },

        },
        nyc: {
            cover: {
                options: {
                    include: ['app/src/**'],
                    exclude: '*.test.*',
                    reporter: ['lcov', 'text-summary'],
                    reportDir: 'coverage',
                    all: true
                },
                cmd: false,
                args: ['grunt', '--gruntfile', 'app/Gruntfile.js', 'mochaTest:e2e']
            }
        }
    });

    grunt.registerTask('e2eTest-watch', ['watch:e2eTest']);

    grunt.registerTask('serve', ['express:dev', 'watch']);

    grunt.registerTask('test', ['mochaTest:e2e']);

    grunt.registerTask('default', 'serve');

    grunt.loadNpmTasks('grunt-simple-nyc');
};
