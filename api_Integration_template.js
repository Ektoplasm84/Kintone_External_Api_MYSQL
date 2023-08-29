(function () {
  "use strict";

  // Constants
  const apiURL = "xx"; // API URL
  const apiKey = "xx"; // Your API key
  const statusFieldCode = "status"; // Status field code
  const stockStatusTableFieldCode = "XX"; // Table field code for stock status
  const table09FieldCode = "XX"; // Field code for the 09 Field Table
  const table07FieldCode = "XX"; // Field code for the 07 Field Table

  // Spin Boy

  var spinner = new kintoneUIComponent.Spinner({});
  var body = document.getElementsByTagName("BODY")[0];
  body.appendChild(spinner.render());
  spinner.hide();

  // Function to check the product status using an external API
  function checkProductStatus(productName) {
    const queryParams = `productValue=${encodeURIComponent(productName)}`;
    const url = `${apiURL}?${queryParams}`;

    return fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("API request failed.");
        }
        return response.json();
      })
      .then(function (data) {
        const responseData = {
          data: data.data,
          data9: data.data9,
          data7: data.data7,
        };
        return responseData;
      })
      .catch(function (error) {
        console.error("Error checking product status:", error);
      });
  }

  // Function to update the Kintone record with the retrieved data
  function updateRecord(record, responseData) {
    const productNameField = record["產品編號"];
    if (productNameField) {
      const productName = productNameField.value;

      // Determine if the product data is found
      const foundData = responseData.data.length > 0;
      const foundData9 = responseData.data9.length > 0;
      const foundData7 = responseData.data7.length > 0;

      // Set status value based on whether data is found or not
      let statusValue = "";

      if (foundData && foundData9 && foundData7) {
        statusValue = "DATA FOUND";
      } else if (foundData || foundData9 || foundData7) {
        statusValue = "PARTIAL DATA";
      } else {
        statusValue = "DATA NOT FOUND";
      }

      // Prepare table field value from retrieved data for the data array
      const tableFieldValueData = responseData.data.map((item) => ({
        value: {
          kt_fieldcode: { value: item.json_response_name },
          kt_fieldcode: { value: item.json_response_name },
          kt_fieldcode: { value: item.json_response_name },
          kt_fieldcode: { value: item.json_response_name },
          kt_fieldcode: { value: item.json_response_name },
          kt_fieldcode: { value: item.json_response_name },
        },
      }));

      // Prepare table field value from retrieved data for the data9 array
      const tableFieldValueData9 = responseData.data9.map((item) => {
        const rawDate = item.item.json_response_name;
        const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(
          4,
          6
        )}-${rawDate.substring(6, 8)}`;
        return {
          value: {
            kt_fieldcode: { value: formattedDate },
            kt_fieldcode: { value: item.json_response_name },
            kt_fieldcode: { value: item.json_response_name },
            kt_fieldcode: { value: item.json_response_name },
            kt_fieldcode: { value: item.json_response_name },
            kt_fieldcode: { value: item.json_response_name },
          },
        };
      });

      // Prepare table field value from retrieved data for the data9 array
      const tableFieldValueData7 = responseData.data7.map((item) => {
        const rawDate = item.item.json_response_name;
        const formattedDate1 = `${rawDate.substring(0, 4)}-${rawDate.substring(
          4,
          6
        )}-${rawDate.substring(6, 8)}`;
        return {
          value: {
            kt_fieldcode: { value: formattedDate1 },
            kt_fieldcode: { value: item.json_response_name },
            kt_fieldcode: { value: item.json_response_name },
            kt_fieldcode: { value: item.json_response_name },
            kt_fieldcode: { value: item.json_response_name },
            kt_fieldcode: { value: item.json_response_name },
          },
        };
      });

      // Prepare the update data object
      const updateData = {
        [statusFieldCode]: {
          value: statusValue,
        },
        [stockStatusTableFieldCode]: {
          value: tableFieldValueData,
        },
        [table09FieldCode]: {
          value: tableFieldValueData9,
        },
        [table07FieldCode]: {
          value: tableFieldValueData7,
        },
      };

      // Update the record in Kintone
      kintone
        .api(kintone.api.url("/k/v1/record", true), "PUT", {
          app: kintone.app.getId(),
          id: record["$id"].value,
          record: updateData,
        })
        .then(function (resp) {
          console.log(
            "Record updated successfully for Product Name:",
            productName
          );
        })
        .catch(function (error) {
          console.error(
            "Error updating record for Product Name:",
            productName,
            error
          );
        });
    } else {
      console.log(
        "Product Name Field not found for Record ID:",
        record["$id"].value
      );
    }
  }

  // Function to show a simple popup asking for confirmation
  function showConfirmationPopup() {
    const confirmed = confirm("Are you sure you want to proceed?");
    if (confirmed) {
      console.log("Confirmed!");
      // Retrieve the standard stock records and process updates
      fetchRecordsWithSeek();
    } else {
      console.log("Cancelled!");
    }
  }

  // Function to fetch and process records
  function fetchRecordsWithSeek() {
    var offset = 0;
    var records = [];

    function fetchRecords() {
      var params = {
        app: kintone.app.getId(),
        query: "order by $id asc limit 500 offset " + offset,
      };

      return kintone.api("/k/v1/records", "GET", params).then(function (resp) {
        records = records.concat(resp.records);

        if (resp.records.length === 500) {
          offset += 500;
          return fetchRecords();
        }

        return records;
      });
    }

    fetchRecords().then(function (allRecords) {
      var filteredRecords = allRecords.filter(function (record) {
        return record["產品型錄"].value === "標準庫存";
      });

      processFilteredRecords(filteredRecords);
    });
  }

  // Function to process filtered records
  function processFilteredRecords(filteredRecords) {
    if (filteredRecords.length > 0) {
      console.log("Number of Standard Stock Records:", filteredRecords.length);
      let updatedCount = 0;

      // Process the records and update each one
      filteredRecords.forEach((record) => {
        checkProductStatus(record["產品編號"].value).then(function (data) {
          updateRecord(record, data);
          updatedCount++;
          if (updatedCount === filteredRecords.length) {
            showUpdateSummary(updatedCount);
          }
        });
      });
    } else {
      console.log("No records to update.");
    }
  }

  // Function to show a summary of updated records
  function showUpdateSummary(count) {
    alert(`Updated ${count} records.`);
    spinner.hide();
  }

  // Function to create the standard stock button and add it to the header menu space
  function createStandardStockButton() {
    const standardStockButton = new kintoneUIComponent.Button({
      text: "UPDATE STANDARD RECORDS",
      type: "submit", // Use "normal" type for regular buttons
      className: "custom-button-style", // Add your custom CSS class for styling
    });

    // Attach click event handler to the button
    standardStockButton.on("click", function () {
      showConfirmationPopup();
      spinner.show();
    });

    // Retrieve the header menu space element and add the button
    const headerMenuSpace = kintone.app.getHeaderMenuSpaceElement();
    headerMenuSpace.appendChild(standardStockButton.render());
  }

  // Add the button and process records when the record list page appears
  kintone.events.on("app.record.index.show", function (event) {
    // Prevent duplication of the button
    if (document.getElementById("standardstockbutton") == null) {
      createStandardStockButton();
    }

    console.log("Event:", event);
  });
})();
