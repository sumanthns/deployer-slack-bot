var request = require('request'),
    Promise = require('promise'),
    util = require('../util'),
    info = [];

module.exports = function (param) {
    var status = "",
        counter = 0,
        tag = "",
        channel = param.channel,
        baseUrl = process.env.JENKINS_ENDPOINT,
        crumbHeaders = {},
        auth = {
            user: process.env.JENKINS_USER,
            password: process.env.JENKINS_PASSWORD
        };

    function makeRequest(url, method, data) {
        return new Promise(function (resolve, reject) {
            request({method: method, url: baseUrl + url, formData: data, auth: auth, headers: crumbHeaders},
                function (err, response) {
                    if (err) {
                        console.log(err);
                        reject(err)
                    } else {
                        try {
                            resolve(JSON.parse(response.body))
                        } catch (err) {
                            console.log(err);
                            resolve();
                        }
                    }
                });
        });
    }

    function triggerBuild() {
        util.postMessage(channel, 'Triggering build for ' + param.args[1]);
        return makeRequest('/job/' + param.args[0] + '/job/' + param.args[1] + '/build', 'POST');
    }

    function triggerDeployment() {
        var formData = {
            json: '{"parameter": [{"name":"service", "value":"' + param.args[1] + '"}, {"name":"tag", "value":"' + tag + '"}]}'
        };
        info.push('Triggering deployment for ' + param.args[1] + ' tag:' + tag);
        return makeRequest('/job/deployments/job/deploy-to-dev//build', 'POST', formData);
    }

    function getLastBuildStatus() {
        info.push('Getting last build status for ' + param.args[1]);
        return makeRequest('/job/' + param.args[0] + '/job/' + param.args[1] + '/lastBuild/api/json', 'GET');
    }

    function triggerDeploymentOnSuccess() {
        return getLastBuildStatus().then(function (data) {
            status = data.result;
            tag = data.displayName.replace("\n", "");
            if (status === 'SUCCESS') {
                info.push('Build Result: ' + data.result);
                return triggerDeployment();
            }
            else if (status !== 'SUCCESS' && counter < 10) {
                counter++;
                return triggerDeploymentOnSuccess();
            } else {
                info.push("Last build does not appear to be a success. Something is wrong!")
            }
        })
    }

    function getCrumbs() {
        return makeRequest('/crumbIssuer/api/json', 'GET');
    }

    util.postMessage(channel, "Looking about to deploy. Relax...");
    getCrumbs().then(function (data) {
        crumbHeaders[data.crumbRequestField] = data.crumb;
        return triggerDeploymentOnSuccess()
    }).then(function (data) {
        info.push('Done');
    }).catch(function (err) {
        info.push('Sorry, something went wrong! ' + err)
    }).finally(function(){
        util.postMessage(channel, info.join("\n"));
    });
};