'use strict';
module.exports = function (app, addon) {

    var _ = require('lodash');
    var util = require('util');
    var request = require('request');
    var username = process.env.JIRA_USERNAME;
    var password = process.env.JIRA_PASSWORD;

    app.get('/', function (req, res) {
        res.format({
            'text/html': function () {
                res.redirect('/atlassian-connect.json');
            },
            'application/json': function () {
                res.redirect('/atlassian-connect.json');
            }
        });
    });

    var iconPath = 'images/icons/sport/',
            sports = [
                { id: 'nfl', name: 'American Football', icon: iconPath + 'american_football.png'},
                { id: 'baseball', name: 'Baseball', icon: iconPath + 'baseball.png'},
                { id: 'basketball', name: 'Basketball', icon: iconPath + 'basketball.png'},
                { id: 'football', name: 'Football', icon: iconPath + 'football.png'},
                { id: 'golf', name: 'Golf', icon: iconPath + 'golf.png'},
                { id: 'tennis', name: 'Tennis', icon: iconPath + 'tennis.png'}
            ],
            statuses = [
              { id: 'onTarget', name: 'On Target' },
              { id: 'planning', name: 'Planning' },
              { id: 'delayed', name: 'Delayed' },
              { id: 'atRisk', name: 'At Risk' },
              { id: 'onHoled', name: 'On Hold' }
            ];

    function getFixVersionsByProject(project) {
      return new Promise(function(resolve, reject) {
        var url = `http://${username}:${password}@nowthis.atlassian.net/rest/api/2/project/${project}/versions`;

        request({url: url}, function (error, response, body) {
          if(!error) {
            let rawVersions = JSON.parse(body)
            let versions = []
            rawVersions.forEach(version => {
              if (_.has(version, 'userReleaseDate') === false) {
                version.userReleaseDate = 'TBD'
              }
              if (version.released) {
                version.status = "Released"
              } else {
                version.status = "Unreleased"
              }
              versions.push(version)
            })
            return resolve(versions)
          } else {
            return reject(error)
          }
        });
      })
    }

    function getFixVersionById(id) {
      return new Promise(function(resolve, reject) {
        var url = `http://${username}:${password}@nowthis.atlassian.net/rest/api/2/version/${id}`;

        request({url: url}, function (error, response, body) {
          if(!error) {
            let version = JSON.parse(body)
            console.log(version)
            if (_.has(version, 'userReleaseDate') === false) {
              version.userReleaseDate = 'TBD'
            }
            return resolve(version)
          } else {
            return reject(error)
          }
        });
      })
    }

    function renderMacro(req, res) {
        var status = req.param('status');
        var style;

        if (status) {
          switch(status) {
            case 'On Target':
              style = 'success';
              break;
            case 'Delayed':
              style = 'current';
              break;
            case 'At Risk':
              style = 'error';
              break;
            case 'Planning':
              style = 'complete';
              break;
            default:
              style = 'subtle';
              break;
          }
          res.render('macro/macro-view', {
            status: status,
            style: style
          })
        } else {
          res.render('macro/macro-view', {
            status: 'no status set',
            style: style
          })
        }
    }

    app.get('/macro', addon.authenticate(), function (req, res) {
        renderMacro(req, res);
    });

    app.get('/macro-page', addon.authenticate(), function (req, res) {
        renderMacro(req, res);
    });

    app.get('/editor', addon.authenticate(), function (req, res) {
        // Rendering a template is easy. `render()` takes two params: name of template and a
        // json object to pass the context in.
        res.render('macro/macro-editor', {
          baseUrl: res.locals.hostBaseUrl,
          statuses: statuses
        })

        // //TODO: make a variable req.param('project')
        // getFixVersionsByProject('ADS').then(versions => {
        //   res.render('macro/macro-editor', {
        //       baseUrl: res.locals.hostBaseUrl,
        //       sports: sports,
        //       versions: versions
        //   });
        // })
    });

    // gets versions by project keys async
    app.get('/versions/:projectKey', function (req, res) {
        res.setHeader('Content-Type', 'application/json');
        let projectKey = req.params.projectKey
        getFixVersionsByProject(projectKey).then(versions => {
          res.send(JSON.stringify(versions))
        }).catch(error => {
          res.send(error)
        })
    });

    app.get('/dialog', addon.authenticate(), function (req, res) {
        res.render('dialog', {
            baseUrl: res.locals.hostBaseUrl,
            spaceKey: req.param('spaceKey'),
            spaceId: req.param('spaceId')
        });
    });

    app.get('/hello-world', addon.authenticate(), function (req, res) {
        res.render('hello-world', {
            baseUrl: res.locals.hostBaseUrl
        });
    });

    app.get('/conditions/dialog', addon.authenticate(), function (req, res) {
        res.render('conditions/dialog', {
            shouldDisplay: true
        });
    });

    //end point to send json of projects for autocomplete on the edit page
    app.get('/search/project', function(req, res) {
      res.setHeader('Content-Type', 'application/json');
      var url = `http://${username}:${password}@nowthis.atlassian.net/rest/api/2/project`;

      request({url: url}, function (error, response, body) {
        if(!error) {
          let rawProjects = JSON.parse(body)
          let projects = []
          rawProjects.forEach( (project, index) => {
            let formattedProject = {};
            formattedProject.label = project.name;
            formattedProject.value = project.key;
            projects.push(formattedProject)

            if (index + 1 === rawProjects.length) {
              res.send(JSON.stringify(projects));
            }
          })
        } else {
          res.send(JSON.stringify(error))
        }
      })
    })

};
