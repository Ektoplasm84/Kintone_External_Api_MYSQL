# Custom built .JS app code to allow external Api acccess and Field update

##

Created for a customer that wishes to ingtegrate Kintone functionality , with their existing ERP setup

This generates an API request using a fieldcode that identifies the product name , this in turn , uses that field as a query to a custom made API developed to serve as a middleman between KINTONE and the MYSQL server that holds the data

Due to the enormous amount of data available, and the completexity of the querys , the server processes the individual query, and responds as a json, the program then takes the retreived information , and maps it to the relevants fields in the app.

in this version it is also able to separate products by virtue of their " Status " , in order to avoid uploading thousands of products at a time, as it stands , it only updates products that fit into a predefined category.

the entire update process, with existing methodology shaves down the updating of all relevant stock from a few hours , to under a minute (in these specific circumstances)
