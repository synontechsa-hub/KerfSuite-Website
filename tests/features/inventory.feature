Feature: Inventory Management

  Scenario: Adding a new MDF sheet
    Given a workshop with no assets
    When the admin adds a "full_sheet" of "MDF" with dimensions 2440x1220
    Then the system should generate a name starting with "SHEET-"
    And the asset status should be "available"

  Scenario: Classifying a small offcut
    Given an MDF material exists
    When the admin adds a "custom" piece of "MDF" with dimensions 300x300
    Then the asset should be classified as an "offcut"
    And the system name should start with "OFFCUT-"
