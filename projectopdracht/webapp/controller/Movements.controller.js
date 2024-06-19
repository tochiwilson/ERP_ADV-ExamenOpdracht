sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("projectopdracht.controller.Movements", {

        onInit: function () {
            // Initialize OData model and set it to the view
            this.oModel = this.getOwnerComponent().getModel();
            this.getView().setModel(this.oModel);
            this.uri = "/MovementSet";
            this._items = [];

            // Initialize a JSON model for items and set it to the view with alias 'itemsModel'
            var oItemsModel = new JSONModel({ items: [] });
            this.getView().setModel(oItemsModel, "itemsModel");
        },

        onSelectionChange: function (oEvent) {
            // Handle selection change in the list
            var oList = oEvent.getSource();
            var oSelectedItem = oList.getSelectedItem();

            if (oSelectedItem) {
                // Show detail for selected item
                var oBindingContext = oSelectedItem.getBindingContext();
                this._showDetail(oBindingContext);
            } else {
                // Clear detail if no item is selected
                this._clearDetail();
            }
        },

        _showDetail: function (oBindingContext) {
            // Show detail page and bind the context to it
            var oDetailPage = this.byId("detailPage");
            var oDetailContent = this.byId("detailContent");
            var oNoDataText = this.byId("noDataText");

            oDetailContent.setVisible(true);
            oNoDataText.setVisible(false);

            oDetailPage.bindElement(oBindingContext.getPath());
            this.byId("SplitApp").toDetail(oDetailPage);
        },

        _clearDetail: function () {
            // Clear the detail page
            var oDetailPage = this.byId("detailPage");
            var oDetailContent = this.byId("detailContent");
            var oNoDataText = this.byId("noDataText");

            oDetailContent.setVisible(false);
            oNoDataText.setVisible(true);

            oDetailPage.unbindElement();
            this.byId("SplitApp").toDetail(oDetailPage);
        },

        applyFilters: function () {
            // Apply filters based on user inputs
            var oSelect = this.byId("typeSelect");
            var sSelectedKey = oSelect.getSelectedKey();

            var oStartDatePicker = this.byId("startDatePicker");
            var oEndDatePicker = this.byId("endDatePicker");

            var sStartDate = oStartDatePicker.getValue();
            var sEndDate = oEndDatePicker.getValue();

            var aFilters = [];

            // Add filter for type if selected
            if (sSelectedKey && sSelectedKey !== "all") {
                aFilters.push(new Filter("Type", FilterOperator.EQ, sSelectedKey));
            }

            // Add filter for start date if selected
            if (sStartDate) {
                aFilters.push(new Filter("MovDate", FilterOperator.GE, sStartDate));
            }

            // Add filter for end date if selected
            if (sEndDate) {
                aFilters.push(new Filter("MovDate", FilterOperator.LE, sEndDate));
            }

            // Apply the filters to the list binding
            var oList = this.byId("entryList");
            var oBinding = oList.getBinding("items");
            oBinding.filter(aFilters);
        },

        onOpenCreateDialog: function () {
            // Open the dialog to create a new movement
            this._items = [];
            this.getView().getModel("itemsModel").setProperty("/items", this._items);

            if (!this._createDialog) {
                this._createDialog = this.byId("createMovementDialog");
            }
            this._createDialog.open();
        },

        onCloseCreateDialog: function () {
            // Close the create movement dialog
            if (this._createDialog) {
                this._createDialog.close();
            }
        },

        onSaveNewMovement: function () {
            // Save a new movement
            var location = this.byId("locationSelect").getSelectedKey();
            var type = this.byId("typeSelectDialog").getSelectedKey();
            var date = this.byId("datePicker").getDateValue();
            var partner = this.byId("partnerInput").getValue();

            var newMovement = {
                Location: location,
                Type: type,
                MovDate: date,
                Partner: partner,
                Finished: false,
                Items: this._items
            };

            // Create the movement using the OData model
            this.oModel.create("/MovementSet", newMovement, {
                success: function () {
                    sap.m.MessageToast.show("Movement created successfully");
                },
                error: function () {
                    sap.m.MessageToast.show("Failed to create movement");
                }
            });

            this.onCloseCreateDialog();
        },

        onOpenAddItemDialog: function () {
            // Open the dialog to add a new item to the movement
            if (!this._addItemDialog) {
                this._addItemDialog = this.byId("addItemDialog");
            }
            this._addItemDialog.open();
        },

        onCloseAddItemDialog: function () {
            // Close the add item dialog
            if (this._addItemDialog) {
                this._addItemDialog.close();
            }
        },

        onAddItem: function () {
            // Add a new item to the movement
            var materialNumber = this.byId("materialNumberInput").getValue();
            var quantity = this.byId("quantityInput").getValue();
            var unit = this.byId("unitInput").getValue();

            var newItem = {
                Matnr: materialNumber,
                Umziz: quantity,
                Meins: unit
            };

            // Push the new item to the items array and update the model
            this._items.push(newItem);

            var oItemsModel = this.getView().getModel("itemsModel");
            oItemsModel.setProperty("/items", this._items);

            this.onCloseAddItemDialog();
        },

        onDeleteEntry: function () {
            // Open the confirmation dialog for deleting a movement
            var oDetailPage = this.byId("detailPage");
            var sPath = oDetailPage.getBindingContext().getPath();
            var sId = this.oModel.getProperty(sPath + "/Id");

            if (!this._confirmDeleteDialog) {
                this._confirmDeleteDialog = this.byId("confirmDeleteDialog");
            }

            this._confirmDeleteDialog.open();
            this._deleteEntryId = sId;
        },

        onCloseConfirmDeleteDialog: function () {
            // Close the confirmation delete dialog
            if (this._confirmDeleteDialog) {
                this._confirmDeleteDialog.close();
            }
        },

        onConfirmDelete: function () {
            // Confirm and delete the selected movement
            var sPath = "/MovementSet('" + this._deleteEntryId + "')";
            this.oModel.remove(sPath, {
                success: function () {
                    sap.m.MessageToast.show("Movement deleted successfully");
                },
                error: function () {
                    sap.m.MessageToast.show("Failed to delete movement");
                }
            });

            this.onCloseConfirmDeleteDialog();
        }
    });
});
