$(document).ready(() => {

    let apiSavedChecked = $('.saved_api').is(':checked')
    if(apiSavedChecked){
        $('.save_settings').attr('disabled',false)
    }
    else{
        $('.save_settings').attr('disabled',true)
    }

    $('.saved_api').change(function(){
        let apiSavedChecked = $(this).is(':checked')
        console.log('ttt',apiSavedChecked)
        if(apiSavedChecked){
            $('.save_settings').attr('disabled',false)
        }
        else{
            $('.save_settings').attr('disabled',true)
        }
    })

    function myFunction() {
        var x = document.getElementById("myLinks");
        if (x.style.display === "block") {
            x.style.display = "none";
        } else {
            x.style.display = "block";
        }
    }

    $('.hamburger').click(() => {
        myFunction();
    });

    // When the document is ready, perform the following actions

    chrome.storage.sync.get(['settings'], function(result) {
        // Retrieve the 'settings' value from Chrome storage
        if (result.settings !== undefined) {
            let sett = JSON.parse(result.settings);
            if(sett?.saveData){
                ShowUpdatesPage(result.settings);
            }
            else{
                $('.open_settings').trigger('click');
                $('.open_settings').trigger('click');
            }
            // If the 'settings' value is defined
            // Call the ShowUpdatesPage function with the retrieved settings
        } else {
            $('.settings_page').removeClass('hide');
            // Otherwise, remove the 'hide' class from the element with the class 'settings_page'
        }
    });

    $('.mainwp_url,.mainwp_key,.mainwp_secret').keyup(function(){
        let dashboard_url = $('.mainwp_url').val();
        // Retrieve the value of the input field with the class 'mainwp_url' and assign it to 'dashboard_url'
        let consumer_key = $('.mainwp_key').val();
        // Retrieve the value of the input field with the class 'mainwp_key' and assign it to 'consumer_key'
        let consumer_secret = $('.mainwp_secret').val();

        let settings = {
            dashboard_url,
            consumer_key: btoa(consumer_key),
            consumer_secret: btoa(consumer_secret),
            sync_data:'',
            frequency:'',
            saveData:false
        }
        // Create an object called 'settings' with the previously retrieved values
        chrome.storage.sync.set({ "settings": JSON.stringify(settings) }, function() {})
    })

 

    $('.open_dashboard').click(() => {
        // Call myFunction()
        myFunction();
        // Hide the updates_page and show the settings_page
        $('.updates_page').removeClass('hide');
        $('.settings_page').addClass('hide');
    });

    $('.mainwp-tooltip-ck').click(() => {
        toastr.info('Consumer Key is used for authenticating MainWP REST API requests. API keys can be created in the MainWP REST API settings.');
    });

    $('.mainwp-tooltip-cs').click(() => {
        toastr.info('Consumer Secret is used for authenticating MainWP REST API requests. API keys can be created in the MainWP REST API settings.');
    });

    $('.mainwp-tooltip-cb').click(() => {
        toastr.info('The API Key you generate in your MainWP Dashboard is inactive until it is saved. Once you save the API key in your MainWP Dashboard it is available for use.');
    });

    $('.save_settings').click(async () => {
        // When the element with the class 'save_settings' is clicked, perform the following actions

        let saved_api = $('.saved_api').is(':checked')

        let dashboard_url = $('.mainwp_url').val();
        // Retrieve the value of the input field with the class 'mainwp_url' and assign it to 'dashboard_url'
        let consumer_key = $('.mainwp_key').val();
        // Retrieve the value of the input field with the class 'mainwp_key' and assign it to 'consumer_key'
        let consumer_secret = $('.mainwp_secret').val();
        // Retrieve the value of the input field with the class 'mainwp_secret' and assign it to 'consumer_secret'
        if (dashboard_url == '' || consumer_key == '' || consumer_secret == '') {
            toastr.error('All fields required!');
            return false;
        }

        if (!isUrlValid(dashboard_url)) {
            toastr.error('Please enter a valid MainWP Dashboard URL!')
            return false;
        }

        // Extract the URL up to the TLD
        var pattern = /(https?:\/\/.*?\.[^\/]+)/;
        var match = dashboard_url.match(pattern);

        if (match) {
            dashboard_url = match[1];
        } else {
            toastr.error('Please enter a valid MainWP Dashboard URL!')
        }

        // Validate the client secret and key

        var requestOptions = {
            method: 'GET',
            redirect: 'follow'
            };
            
        let result = await fetch(`${dashboard_url}/wp-json/mainwp/v1/sites/all-sites-count?consumer_key=${consumer_key}&consumer_secret=${consumer_secret}`, requestOptions)
        .then(response => response.json())
        .then(result => result)
        .catch(error => console.log('error', error));

        if(result?.ERROR){
             if(result?.ERROR == 'Incorrect or missing consumer key and/or secret. If the issue persists please reset your authentication details from the MainWP &gt; Settings &gt; REST API page, on your MainWP Dashboard site.'){
                 toastr.error('Make sure your API Key is saved in your MainWP Dashboard');
                 return false;
             }
        }

        let sync_data = {
            // Define an object called 'sync_data'
            wordpress_core_updates: false,
            plugin_updates: false,
            themes_updates: false,
            transalation_updates: false,
            nonmainwp_changes: false,
            // Initialize properties of the 'sync_data' object with boolean values set to false
        }

        $('input[type=checkbox]').each(function() {
            // For each input field of type checkbox, perform the following actions
            if ($(this).is(':checked')) {
                // If the checkbox is checked
                sync_data[$(this).attr('value')] = true;
                // Set the corresponding property in the 'sync_data' object to true
            }
        })

        let frequency = $('.frequency').find(':selected').val();
        // Retrieve the value of the selected option in the element with the class 'frequency' and assign it to 'frequency'

        let settings = {
                dashboard_url,
                consumer_key: btoa(consumer_key),
                consumer_secret: btoa(consumer_secret),
                sync_data,
                frequency,
                saveData:true,
                saved_api
            }
            // Create an object called 'settings' with the previously retrieved values


        chrome.storage.sync.set({ "settings": JSON.stringify(settings) }, function() {
            chrome.runtime.sendMessage({ type: "updateCron" });
            // Store the 'settings' object in Chrome storage as a JSON string
            $('.settings_page').addClass('hide');
            // Add the 'hide' class to the element with the class 'settings_page'
            ShowUpdatesPage(JSON.stringify(settings));
            // Call the ShowUpdatesPage function with the JSON stringified 'settings'
        });
        toastr.success('Settings saved successfully!');
    })

    const ShowUpdatesPage = (settings) => {
        // Define a function called 'ShowUpdatesPage' that takes a parameter 'settings'
        let url = JSON.parse(settings).dashboard_url;
        let updatedSettings = JSON.parse(settings).sync_data;
        let dash_url = url;
        // Parse the JSON string 'settings', retrieve the 'sync_data' property, and assign it to 'updatedSettings'

        Object.keys(updatedSettings).map((k) => {
            // Retrieve the keys of the 'updatedSettings' object and iterate over them
            // console.log('::::',updatedSettings[k]);
            if (updatedSettings[k]) {
                // If the value of the current key is true
                $('.' + k + '').removeClass('hide');
                // Remove the 'hide' class from the element with the class equal to the current key
            } else {
                // If the value of the current key is false
                $('.' + k + '').addClass('hide');
                // Add the 'hide' class from the element with the class equal to the current key
            }
        })

        $('.my_dashboard').html('<a href="' + url + '/wp-admin/admin.php?page=mainwp_tab" target="_blank"><i class="fas fa-sign-in"></i> </a> <a href="' + url + '" target="_blank">' + url.split('//')[1] + '</a>')
        chrome.storage.sync.get(['last_updated'], (result) => {
            if (result.last_updated == undefined) {
                getUpdatesCount();
            } else {
                $('.last_sync').text(result.last_updated)
                chrome.storage.sync.get(["sync_updates"], function(result) {
                    if (result.sync_updates !== undefined) {
                        let syncUpdates = JSON.parse(result.sync_updates)
                        let total = 0;

                        Object.keys(syncUpdates).map((k) => {
                            if (k !== 'total_updates_count') {
                                let key = k.split('_count')[0];

                                if (updatedSettings[key] && k !== 'nonmainwp_changes_count') {
                                    total += parseFloat(syncUpdates[k]);
                                }

                                if (k === 'plugin_updates_count') {
                                    dash_url = url + '/wp-admin/admin.php?page=UpdatesManage&tab=plugins-updates';
                                } else if (k === 'themes_updates_count') {
                                    dash_url = url + '/wp-admin/admin.php?page=UpdatesManage&tab=themes-updates';
                                } else if (k === 'wordpress_core_updates_count') {
                                    dash_url = url + '/wp-admin/admin.php?page=UpdatesManage&tab=wordpress-updates';
                                } else if (k === 'transalation_updates_count') {
                                    dash_url = url + '/wp-admin/admin.php?page=UpdatesManage&tab=translations-updates';
                                } else if (k === 'nonmainwp_changes_count') {
                                    dash_url = url + '/wp-admin/admin.php?page=mainwp_tab';
                                }

                                if (syncUpdates[k] > 0) {
                                    $('.' + k + '').html( '<a href="' + dash_url + '" target="_blank">' + syncUpdates[k] + '</a>');
                                } else {
                                    $('.' + k + '').html('<i class="fas fa-check" style="color:#7fb100"></i>');
                                }
                                $('.' + k + '').siblings('.spinner').addClass('hide');
                                $('.' + k + '').removeClass('hide');

                            }
                        });

                        $('.total_updates_count').html( '<a href="' + dash_url + '" target="_blank">' + total + '</a>');
                        $('.total_updates_count').siblings('.spinner').addClass('hide');
                        $('.total_updates_count').removeClass('hide');
                    }

                })
            }
        })
        $('.updates_page').removeClass('hide');
        // Remove the 'hide' class from the element with the class 'updates

    }

    // Event listener for the 'open_settings' button click
    $('.open_settings').click(() => {
        // Retrieve the settings from Chrome storage
        chrome.storage.sync.get(['settings'], function(result) {
            if (result.settings !== undefined) {
                // If settings exist in Chrome storage, parse the settings JSON
                let settings = JSON.parse(result.settings);

                let saved_api = settings?.saved_api;
                if(saved_api){
                    $('.saved_api').prop('checked',true);
                    $('.save_settings').prop('disabled',false);

                }


                // Set the values of input fields with the corresponding settings values
                $('.mainwp_url').val(settings.dashboard_url);
                $('.mainwp_key').val(atob(settings.consumer_key));
                $('.mainwp_secret').val(atob(settings.consumer_secret));

                // Get the update settings from the 'sync_data' property of settings
                let UpdateSettings = settings.sync_data;

                // Iterate over the keys of the 'UpdateSettings' object
                Object.keys(UpdateSettings).map((k) => {
                    // Retrieve the keys of the 'UpdateSettings' object and iterate over them
                    if (UpdateSettings[k]) {
                        // If the value of the current key is true, check the corresponding input checkbox
                        $('input[value=' + k + ']').prop('checked', true);
                    }
                })

                // Set the value of the frequency input field with the frequency setting value
                $('.frequency').val(settings.frequency)
            }

            // Call myFunction()
            myFunction();

            // Hide the updates_page and show the settings_page
            $('.updates_page').addClass('hide');
            $('.settings_page').removeClass('hide');
        })
    })

    // Function to validate URL input
    function isUrlValid(userInput) {
        var res = userInput.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
        if (res == null)
            return false;
        else
            return true;
    }

    $('.btn_sync').click(() => {
        let updatedData = {
            total_updates_count: 0,
            plugin_updates_count: 0,
            themes_updates_count: 0,
            wordpress_core_updates_count: 0,
            transalation_updates_count: 0,
            nonmainwp_changes_count: 0
        };

        // Update the UI with the update counts
        Object.keys(updatedData).map((k) => {
            $('.' + k + '').addClass('hide');
            $('.' + k + '').siblings('.spinner').removeClass('hide');
        });
        getUpdatesCount(true);
    })


    // Function to get the count of updates and update the UI
    const getUpdatesCount = (notification) => {
        // Get the settings from Chrome storage
        chrome.storage.sync.get(['settings'], async(resp) => {
            // Retrieve the settings object
            let settings = JSON.parse(resp.settings);

            // Get the count of updates using the getUpdates function
            let updates = await getUpdates(settings.dashboard_url, atob(settings.consumer_key), atob(settings.consumer_secret));

            // Get the count of non-WordPress updates using the getNonWPUpdates function
            let nonWPupdates = await getNonWPUpdates(settings.dashboard_url, atob(settings.consumer_key), atob(settings.consumer_secret));

            // Create an updatedData object to store the update counts
            let updatedData = {
                total_updates_count: updates.total,
                plugin_updates_count: updates.plugins,
                themes_updates_count: updates.themes,
                wordpress_core_updates_count: updates.wp,
                transalation_updates_count: updates.translations,
                nonmainwp_changes_count: nonWPupdates
            };

            let dash_url = settings.dashboard_url + '/wp-admin/admin.php?page=mainwp_tab';

            // Get the current date and format it
            const date = new Date();
            const formattedDate = date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });

            // Store the updatedData object in Chrome storage as "sync_updates"
            chrome.storage.sync.set({ "sync_updates": JSON.stringify(updatedData) }, function() {});

            // Store the formatted date in Chrome storage as "last_updated"
            chrome.storage.sync.set({ "last_updated": formattedDate }, function() {});

            let sync_data = settings.sync_data;
            // Update the UI with the update counts
            let total = 0;
            Object.keys(updatedData).map((k) => {
                if (k !== 'total_updates_count') {
                    let key = k.split('_count')[0];
                    if (sync_data[key] && k !== 'nonmainwp_changes_count') {
                        total += parseFloat(updatedData[k]);
                    }

                    if (k === 'plugin_updates_count') {
                        dash_url = settings.dashboard_url + '/wp-admin/admin.php?page=UpdatesManage&tab=plugins-updates';
                    } else if (k === 'themes_updates_count') {
                        dash_url = settings.dashboard_url + '/wp-admin/admin.php?page=UpdatesManage&tab=themes-updates';
                    } else if (k === 'wordpress_core_updates_count') {
                        dash_url = settings.dashboard_url + '/wp-admin/admin.php?page=UpdatesManage&tab=wordpress-updates';
                    } else if (k === 'transalation_updates_count') {
                        dash_url = settings.dashboard_url + '/wp-admin/admin.php?page=UpdatesManage&tab=translations-updates';
                    } else if (k === 'nonmainwp_changes_count') {
                        dash_url = settings.dashboard_url + '/wp-admin/admin.php?page=mainwp_tab';
                    }

                    $('.' + k + '').html( '<a href="' + dash_url + '" target="_blank">' + updatedData[k] + '</a>');
                    $('.' + k + '').siblings('.spinner').addClass('hide');
                    $('.' + k + '').removeClass('hide');
                }
            });

            $('.total_updates_count').html( '<a href="' + dash_url + '" target="_blank">' + total + '</a>');
            $('.total_updates_count').siblings('.spinner').addClass('hide');
            $('.total_updates_count').removeClass('hide');

            let total_cut = (total > 99) ? 99 : total;
            let nonWPupdates_cut = (nonWPupdates > 99) ? 99 : nonWPupdates;

            if (total > 0 || (settings.sync_data.nonmainwp_changes && nonWPupdates > 0)) {
                let badge_text = total_cut.toString();
                let notification_message = `You have ${total} updates available`;

                if(settings.sync_data.nonmainwp_changes && nonWPupdates > 0) {
                    badge_text += `-${nonWPupdates_cut.toString()}`;
                    notification_message += ` and ${nonWPupdates} Non-MainWP changes to review`;
                }

                chrome.action.setBadgeText({ text: badge_text });
                chrome.action.setBadgeBackgroundColor({ color: '#FFD300' });
                if (notification) {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "assets/images/mainwp128.png",
                        title: "MainWP Updates",
                        message: notification_message
                    });
                }
            } else {
                chrome.action.setBadgeText({ text: '' });
            }
            
            // Update the last_sync element with the formatted date
            $('.last_sync').text(formattedDate);
        });
    }


    // Function to get the count of updates available for all sites
    const getUpdates = async(dashboardUrl, ConsumerKey, ConsumerSecret) => {
        return new Promise((resolve, reject) => {

            // Set the request options for the API call
            var requestOptions = {
                method: 'GET',
                redirect: 'follow'
            };

            // Fetch the updates count for all sites using the provided API endpoint and authentication credentials
            fetch(`${dashboardUrl}/wp-json/mainwp/v1/sites/sites-available-updates-count?consumer_key=${ConsumerKey}&consumer_secret=${ConsumerSecret}`, requestOptions)
                .then(response => response.json())
                .then(result => resolve(result))
                .catch(error => reject(error));
        })
    }

    // Function to get the count of non-WordPress updates
    const getNonWPUpdates = async(dashboardUrl, ConsumerKey, ConsumerSecret) => {
        return new Promise(async(resolve, reject) => {

            // Set the request options for the initial API call
            var requestOptions = {
                method: 'GET',
                redirect: 'follow'
            };

            // Fetch all sites using the provided API endpoint and authentication credentials
            let allSites = await fetch(`${dashboardUrl}/wp-json/mainwp/v1/sites/all-sites?consumer_key=${ConsumerKey}&consumer_secret=${ConsumerSecret}`, requestOptions)
                .then(response => response.json())
                .then(result => result)
                .catch(error => console.log('error', error));

            // Get the keys (site IDs) of allSites as an array
            let allKeys = Object.keys(allSites).map((k) => k);

            // Variable to store the count of non-WordPress updates
            let nonWPupdateCount = 0;

            // Use Promise.all to run the API calls for each site concurrently
            await Promise.all(allKeys.map(async(k) => {
                // Set the request options for the API call
                var requestOptions = {
                    method: 'GET',
                    redirect: 'follow'
                };

                // Fetch the non-WordPress changes count for each site using the site ID and authentication credentials
                await fetch(`${dashboardUrl}/wp-json/mainwp/v1/site/non-mainwp-changes-count?site_id=${k}&consumer_key=${ConsumerKey}&consumer_secret=${ConsumerSecret}`, requestOptions)
                    .then(response => response.json())
                    .then(result => {
                        // Increment the nonWPupdateCount by the count obtained from the API response
                        nonWPupdateCount += result.count;
                    })
                    .catch(error => console.log('error', error));
            }))

            // Resolve the promise with the final nonWPupdateCount
            resolve(nonWPupdateCount);
        })
    }
    
})