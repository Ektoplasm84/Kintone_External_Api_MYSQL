(function () {
  "use strict";

  // Constants
  const apiURL = "https://api.chiangly.autos/api/query"; // Your API URL
  const apiKey =
    "1iLxZeUAXPPBHEHrcvDrQuZn6RgPsVKOiqq0ZxE9FUbPyYBeTX4LKv5SDuuwIM8eyH2PIHkkZiyGejLwtWNZCcHHAD8fHKBqyt0PyVJyGXNtRcyXLYJWca0OzMAhR3Ly"; // Your API key
  const statusFieldCode = "status"; // Status field code
  const stockStatusTableFieldCode = "庫存狀況"; // Table field code for stock status
  const table09FieldCode = "表格"; // Field code for the 09 Field Table
  const table07FieldCode = "表格_0"; // Field code for the 07 Field Table

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
          倉庫代號: { value: item.stockname },
          現庫存量: { value: item.quatity1 },
          借出未還: { value: item.quatity2 },
          借入未還: { value: item.quatity3 },
          客戶寄庫: { value: item.quatity4 },
          帳務庫存量: { value: item.amount },
        },
      }));

      // Prepare table field value from retrieved data for the data9 array
      const tableFieldValueData9 = responseData.data9.map((item) => {
        const rawDate = item.Fc09;
        const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(
          4,
          6
        )}-${rawDate.substring(6, 8)}`;
        return {
          value: {
            訂單預定交期: { value: formattedDate },
            訂單編號: { value: item.Fc01 },
            客戶別: { value: item.abbr },
            未交數量: { value: item.qty1 },
            訂單數量: { value: item.qty2 },
            已交訂單: { value: item.qty3 },
          },
        };
      });

      // Prepare table field value from retrieved data for the data9 array
      const tableFieldValueData7 = responseData.data7.map((item) => {
        const rawDate = item.gc09;
        const formattedDate1 = `${rawDate.substring(0, 4)}-${rawDate.substring(
          4,
          6
        )}-${rawDate.substring(6, 8)}`;
        return {
          value: {
            採購預定交期: { value: formattedDate1 }, // Date
            採購單號: { value: item.gc01 }, // P.O
            供應商別: { value: item.abbr }, // Supplier
            未進數量: { value: item.qty1 }, // Not Entered Q
            採購數量: { value: item.qty2 }, // Purchase Q
            已進數量: { value: item.qty3 }, // Incoming Q
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
