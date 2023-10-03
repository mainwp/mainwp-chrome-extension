chrome.runtime.onInstalled.addListener(function() {
    appId = chrome.runtime.id;
});

// Save through API 
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        switch (message.type) {
            case "updateCron":
                updateCron();
                break;

        }
    }
);

chrome.windows.onCreated.addListener(function() {
    chrome.storage.sync.get(["sync_updates"], function(result) {
        if(result.sync_updates !== undefined){
            let updatedData = JSON.parse(result.sync_updates);
            chrome.storage.sync.get(['settings'],function(resp){
                if(resp.settings !== undefined){
                    let settings = JSON.parse(resp.settings);
                    let sync_data = settings.sync_data;
                    let nonWPupdates = updatedData?.nonmainwp_changes_count
                    // Update the UI with the update counts
                    let total = 0;
                    Object.keys(updatedData).map((k) => {
                        if (k !== 'total_updates_count') {
                            let key = k.split('_count')[0];
                            if (sync_data[key] && k !== 'nonmainwp_changes_count') {
                                total += parseFloat(updatedData[k]);
                            }
                        }
                    });

                    let total_cut = (total > 99) ? 99 : total;
                    let nonWPupdates_cut = (nonWPupdates > 99) ? 99 : nonWPupdates;
                    if (total > 0 || (settings.sync_data.nonmainwp_changes && nonWPupdates > 0)) {
                        let badge_text = total_cut.toString();
                        let notification_message = `You have ${total} updates available`;

                        if (settings.sync_data.nonmainwp_changes && nonWPupdates > 0) {
                            badge_text += `-${nonWPupdates_cut.toString()}`;
                            notification_message += ` and ${nonWPupdates} Non-MainWP changes to review`;
                        }

                        chrome.action.setBadgeText({ text: badge_text });
                        chrome.action.setBadgeBackgroundColor({ color: '#FFD300' });
                    } else {
                        chrome.action.setBadgeText({ text: '' });
                    }

                }
            })
        }
    });
})

const updateCron = () => {
    chrome.storage.sync.get(['settings'], async(resp) => {
        if (resp.settings !== undefined) {
            // Retrieve the settings object
            let settings = JSON.parse(resp.settings);

            // Convert 24 hours to minutes
            const minutesIn24Hours = 24 * 60;

            // Calculate the interval by dividing the minutes in 24 hours by the selected number
            const interval = minutesIn24Hours / settings.frequency;

            // Convert the interval to minutes (alarms in Chrome use minutes)
            const intervalInMinutes = Math.ceil(interval);

            console.log('intervalInMinutes',intervalInMinutes)
            // Clear any existing alarm with the name 'myAlarm'
            chrome.alarms.clear('myCron', wasCleared => {
                // Set a new alarm
                chrome.alarms.create('myCron', {
                    periodInMinutes: intervalInMinutes // Repeat every 5 minutes
                });
            });


        }
    })
}

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'myCron') {
        // Run your code here
        const now = new Date();
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const formattedDate = now.toLocaleString('en-US', options);
        console.log('Cron task executed!', formattedDate);

        getUpdatesCount();
    }
});

// Function to get the count of updates and update the UI
const getUpdatesCount = () => {
    // Get the settings from Chrome storage
    chrome.storage.sync.get(['settings'], async(resp) => {

        if (resp.settings !== undefined) {
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
                }
            });

            let total_cut = (total > 99) ? 99 : total;
            let nonWPupdates_cut = (nonWPupdates > 99) ? 99 : nonWPupdates;
            if (total > 0 || (settings.sync_data.nonmainwp_changes && nonWPupdates > 0)) {
                let badge_text = total_cut.toString();
                let notification_message = `You have ${total} updates available`;

                if (settings.sync_data.nonmainwp_changes && nonWPupdates > 0) {
                    badge_text += `-${nonWPupdates_cut.toString()}`;
                    notification_message += ` and ${nonWPupdates} Non-MainWP changes to review`;
                }

                chrome.action.setBadgeText({ text: badge_text });
                chrome.action.setBadgeBackgroundColor({ color: '#FFD300' });
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "assets/images/mainwp128.png",
                        title: "MainWP Updates",
                        message: notification_message
                    });
            } else {
                chrome.action.setBadgeText({ text: '' });
            }

        }

    });
}

// Handle notification click event
chrome.notifications.onClicked.addListener(notificationId => {

    chrome.storage.sync.get(['settings'], async(resp) => {

        if (resp.settings !== undefined) {
            // Retrieve the settings object
            let settings = JSON.parse(resp.settings);
            let dash_url = settings.dashboard_url + '/wp-admin/admin.php?page=mainwp_tab';
            chrome.tabs.create({ url: dash_url });
        }
    })

    // Open the URL when notification is clicked
});

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