// ================================================
// A COMPREHENSIVE JAVA LANGUAGE EXAMPLE
// ================================================

// 1. PACKAGE DECLARATION (Organizes classes)
package com.example.demo;

// 2. IMPORT STATEMENTS (Like #include in C)
import java.util.Scanner;       // For reading user input
import java.util.ArrayList;     // For dynamic arrays
import java.util.HashMap;       // For key-value pairs
import java.time.LocalDate;     // For date handling

// 3. MAIN CLASS (Filename must be JavaDemo.java)
// The 'public' modifier means it's accessible from anywhere.
public class JavaDemo {

    // 4. STATIC CLASS VARIABLE (Shared across all instances)
    private static final String SYSTEM_NAME = "Java Demonstration System";

    // 5. INSTANCE VARIABLES (Belong to an object of this class)
    private String instanceData;

    // 6. CONSTRUCTOR (Initializes new objects)
    public JavaDemo(String data) {
        this.instanceData = data; // 'this' refers to the current object
        System.out.println("A JavaDemo object was created with data: " + data);
    }

    // 7. THE MAIN METHOD - PROGRAM ENTRY POINT
    // 'public static void' is the required signature.
    // 'String[] args' can hold command-line arguments.
    public static void main(String[] args) {
        System.out.println("=== " + SYSTEM_NAME + " ===\n");

        // 8. PRIMITIVE DATA TYPES AND VARIABLES
        demonstratePrimitivesAndStrings();

        // 9. CONTROL FLOW STATEMENTS
        demonstrateControlFlow();

        // 10. ARRAYS AND COLLECTIONS FRAMEWORK
        demonstrateArraysAndCollections();

        // 11. OBJECT-ORIENTED PROGRAMMING
        demonstrateOOP();

        // 12. EXCEPTION HANDLING
        demonstrateExceptionHandling();

        System.out.println("\n=== Program Finished Successfully ===");
    }

    // 9. METHOD DEMONSTRATING PRIMITIVES, STRINGS, and I/O
    private static void demonstratePrimitivesAndStrings() {
        System.out.println("--- 1. Primitives, Strings, and I/O ---");

        // Primitive data types
        byte smallNumber = 100;          // 8-bit integer
        short mediumNumber = 10000;      // 16-bit integer
        int age = 30;                    // 32-bit integer (most common)
        long bigNumber = 1000000000L;    // 64-bit integer (note the 'L')
        float height = 1.85f;            // 32-bit float (note the 'f')
        double preciseValue = 1.85123456789; // 64-bit double (most common)
        char initial = 'A';              // Single 16-bit Unicode character
        boolean isJavaFun = true;        // true or false

        System.out.println("Age: " + age);
        System.out.println("Height: " + height + "m");
        System.out.println("Initial: " + initial);
        System.out.println("Is Java fun? " + isJavaFun);

        // String is a class, not a primitive, but is fundamental
        String greeting = "Hello, World!";
        String name = "Alice";
        System.out.println("String length: " + greeting.length());
        System.out.println("Uppercase: " + greeting.toUpperCase());
        System.out.println("Concatenation: " + greeting + " My name is " + name);

        // Simple input using Scanner
        Scanner scanner = new Scanner(System.in);
        System.out.print("\nEnter your name: ");
        String userName = scanner.nextLine(); // Read a line of text
        System.out.println("Hello, " + userName + "!");
        // Note: We won't close the scanner yet as we'll use it later.
        System.out.println();
    }

    // 10. METHOD DEMONSTRATING CONTROL FLOW
    private static void demonstrateControlFlow() {
        System.out.println("--- 2. Control Flow ---");

        int number = 10;

        // if-else if-else statement
        if (number > 10) {
            System.out.println(number + " is greater than 10.");
        } else if (number < 10) {
            System.out.println(number + " is less than 10.");
        } else {
            System.out.println(number + is exactly 10.");
        }

        // switch expression (Java 14+ enhanced switch)
        String dayOfWeek = "Monday";
        String dayType = switch (dayOfWeek) {
            case "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" -> "Weekday";
            case "Saturday", "Sunday" -> "Weekend";
            default -> "Invalid day";
        };
        System.out.println(dayOfWeek + " is a " + dayType);

        // for loop
        System.out.print("For loop (0 to 4): ");
        for (int i = 0; i < 5; i++) {
            System.out.print(i + " ");
        }
        System.out.println();

        // enhanced for loop (for-each)
        int[] numbers = {10, 20, 30};
        System.out.print("Enhanced for loop: ");
        for (int num : numbers) {
            System.out.print(num + " ");
        }
        System.out.println();

        // while loop
        System.out.print("While loop (countdown 3 to 1): ");
        int countdown = 3;
        while (countdown > 0) {
            System.out.print(countdown + "... ");
            countdown--;
        }
        System.out.println("Liftoff!");

        // do-while loop (executes at least once)
        int x = 5;
        System.out.print("Do-While: ");
        do {
            System.out.print(x + " ");
            x++;
        } while (x < 5);
        System.out.println("\n");
    }

    // 11. METHOD DEMONSTRATING ARRAYS AND COLLECTIONS
    private static void demonstrateArraysAndCollections() {
        System.out.println("--- 3. Arrays and Collections ---");

        // Array (fixed size)
        String[] fruitsArray = {"Apple", "Banana", "Cherry"};
        System.out.print("Array: ");
        for (String fruit : fruitsArray) {
            System.out.print(fruit + " ");
        }
        System.out.println();

        // ArrayList (dynamic size, part of Collections Framework)
        ArrayList<String> fruitList = new ArrayList<>();
        fruitList.add("Apple"); // Add elements
        fruitList.add("Banana");
        fruitList.add("Cherry");
        fruitList.set(2, "Cherry"); // Correct a typo
        fruitList.remove("Banana"); // Remove an element
        fruitList.add(1, "Blueberry"); // Add at specific index

        System.out.println("ArrayList: " + fruitList);
        System.out.println("Size of list: " + fruitList.size());
        System.out.println("Element at index 0: " + fruitList.get(0));

        // HashMap (key-value pairs)
        HashMap<String, Integer> inventory = new HashMap<>();
        inventory.put("Apples", 50);
        inventory.put("Oranges", 25);
        inventory.put("Bananas", 40);

        System.out.println("HashMap: " + inventory);
        System.out.println("Number of Apples: " + inventory.get("Apples"));
        System.out.println();
    }

    // 12. METHOD DEMONSTRATING OOP (CLASSES, OBJECTS, INHERITANCE)
    private static void demonstrateOOP() {
        System.out.println("--- 4. Object-Oriented Programming ---");

        // Create an instance of the main class using its constructor
        JavaDemo demoObject = new JavaDemo("Test Data");

        // Create objects from other classes
        Book book1 = new Book("Effective Java", "Joshua Bloch", 2018, 49.99);
        EBook ebook1 = new EBook("Java: The Complete Reference", "Herbert Schildt", 2022, 35.50, "PDF");

        // Use object methods
        book1.displayInfo();
        ebook1.displayInfo(); // This calls the overridden version

        // Demonstrate polymorphism
        System.out.println("\n--- Polymorphism ---");
        Book[] library = new Book[2];
        library[0] = book1;
        library[1] = ebook1; // EBook "is-a" Book

        for (Book book : library) {
            book.displayInfo(); // Runtime polymorphism - calls the correct version
        }
        System.out.println();
    }

    // 13. METHOD DEMONSTRATING EXCEPTION HANDLING
    private static void demonstrateExceptionHandling() {
        System.out.println("--- 5. Exception Handling ---");

        Scanner scanner = new Scanner(System.in);

        try {
            System.out.print("Enter a number to divide 100 by: ");
            String input = scanner.nextLine();

            // This line could throw a NumberFormatException
            int divisor = Integer.parseInt(input);

            // This line could throw an ArithmeticException
            int result = 100 / divisor;

            System.out.println("100 / " + divisor + " = " + result);

        } catch (NumberFormatException e) {
            System.err.println("Error: That's not a valid number! (" + e.getMessage() + ")");
        } catch (ArithmeticException e) {
            System.err.println("Error: You can't divide by zero!");
        } catch (Exception e) { // Catch any other unexpected exception
            System.err.println("An unexpected error occurred: " + e.getMessage());
        } finally {
            // This block always executes, used for cleanup (like closing resources)
            System.out.println("This 'finally' block always runs.");
            scanner.close(); // It's good practice to close the Scanner
        }
    }
}

// 14. A SEPARATE CLASS (Usually in its own file, but can be in same for demo)
// 'class' is the default modifier (package-private)
class Book {
    // 15. ENCAPSULATION: private fields with public getters/setters
    private String title;
    private String author;
    private int publishYear;
    protected double price; // 'protected' is accessible in subclasses and package

    // 16. CONSTRUCTOR
    public Book(String title, String author, int publishYear, double price) {
        this.title = title;
        this.author = author;
        this.publishYear = publishYear;
        this.price = price;
    }

    // 17. METHODS (Behavior)
    public void displayInfo() {
        System.out.printf("Book: '%s' by %s (%d). $%.2f\n",
                title, author, publishYear, price);
    }

    // 18. GETTERS AND SETTERS (Accessors and Mutators)
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public int getPublishYear() { return publishYear; }
    public void setPublishYear(int publishYear) { this.publishYear = publishYear; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}

// 19. A SUBCLASS (INHERITANCE) - EBook "is-a" Book
class EBook extends Book {
    private String format;

    // 20. SUBCLASS CONSTRUCTOR using 'super' to call parent constructor
    public EBook(String title, String author, int publishYear, double price, String format) {
        super(title, author, publishYear, price); // Call parent constructor
        this.format = format;
    }

    // 21. METHOD OVERRIDING (Runtime Polymorphism)
    @Override
    public void displayInfo() {
        // super.displayInfo(); // Could call the parent version first
        System.out.printf("EBook: '%s' [%s format]. $%.2f\n",
                getTitle(), format, price); // 'price' is accessible because it's protected
    }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }
}


// ================================================
// A COMPREHENSIVE JAVA LANGUAGE EXAMPLE
// ================================================

// 1. PACKAGE DECLARATION (Organizes classes)
package com.example.demo;

// 2. IMPORT STATEMENTS (Like #include in C)
import java.util.Scanner;       // For reading user input
import java.util.ArrayList;     // For dynamic arrays
import java.util.HashMap;       // For key-value pairs
import java.time.LocalDate;     // For date handling

// 3. MAIN CLASS (Filename must be JavaDemo.java)
// The 'public' modifier means it's accessible from anywhere.
public class JavaDemo {

    // 4. STATIC CLASS VARIABLE (Shared across all instances)
    private static final String SYSTEM_NAME = "Java Demonstration System";

    // 5. INSTANCE VARIABLES (Belong to an object of this class)
    private String instanceData;

    // 6. CONSTRUCTOR (Initializes new objects)
    public JavaDemo(String data) {
        this.instanceData = data; // 'this' refers to the current object
        System.out.println("A JavaDemo object was created with data: " + data);
    }

    // 7. THE MAIN METHOD - PROGRAM ENTRY POINT
    // 'public static void' is the required signature.
    // 'String[] args' can hold command-line arguments.
    public static void main(String[] args) {
        System.out.println("=== " + SYSTEM_NAME + " ===\n");

        // 8. PRIMITIVE DATA TYPES AND VARIABLES
        demonstratePrimitivesAndStrings();

        // 9. CONTROL FLOW STATEMENTS
        demonstrateControlFlow();

        // 10. ARRAYS AND COLLECTIONS FRAMEWORK
        demonstrateArraysAndCollections();

        // 11. OBJECT-ORIENTED PROGRAMMING
        demonstrateOOP();

        // 12. EXCEPTION HANDLING
        demonstrateExceptionHandling();

        System.out.println("\n=== Program Finished Successfully ===");
    }

    // 9. METHOD DEMONSTRATING PRIMITIVES, STRINGS, and I/O
    private static void demonstratePrimitivesAndStrings() {
        System.out.println("--- 1. Primitives, Strings, and I/O ---");

        // Primitive data types
        byte smallNumber = 100;          // 8-bit integer
        short mediumNumber = 10000;      // 16-bit integer
        int age = 30;                    // 32-bit integer (most common)
        long bigNumber = 1000000000L;    // 64-bit integer (note the 'L')
        float height = 1.85f;            // 32-bit float (note the 'f')
        double preciseValue = 1.85123456789; // 64-bit double (most common)
        char initial = 'A';              // Single 16-bit Unicode character
        boolean isJavaFun = true;        // true or false

        System.out.println("Age: " + age);
        System.out.println("Height: " + height + "m");
        System.out.println("Initial: " + initial);
        System.out.println("Is Java fun? " + isJavaFun);

        // String is a class, not a primitive, but is fundamental
        String greeting = "Hello, World!";
        String name = "Alice";
        System.out.println("String length: " + greeting.length());
        System.out.println("Uppercase: " + greeting.toUpperCase());
        System.out.println("Concatenation: " + greeting + " My name is " + name);

        // Simple input using Scanner
        Scanner scanner = new Scanner(System.in);
        System.out.print("\nEnter your name: ");
        String userName = scanner.nextLine(); // Read a line of text
        System.out.println("Hello, " + userName + "!");
        // Note: We won't close the scanner yet as we'll use it later.
        System.out.println();
    }

    // 10. METHOD DEMONSTRATING CONTROL FLOW
    private static void demonstrateControlFlow() {
        System.out.println("--- 2. Control Flow ---");

        int number = 10;

        // if-else if-else statement
        if (number > 10) {
            System.out.println(number + " is greater than 10.");
        } else if (number < 10) {
            System.out.println(number + " is less than 10.");
        } else {
            System.out.println(number + is exactly 10.");
        }

        // switch expression (Java 14+ enhanced switch)
        String dayOfWeek = "Monday";
        String dayType = switch (dayOfWeek) {
            case "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" -> "Weekday";
            case "Saturday", "Sunday" -> "Weekend";
            default -> "Invalid day";
        };
        System.out.println(dayOfWeek + " is a " + dayType);

        // for loop
        System.out.print("For loop (0 to 4): ");
        for (int i = 0; i < 5; i++) {
            System.out.print(i + " ");
        }
        System.out.println();

        // enhanced for loop (for-each)
        int[] numbers = {10, 20, 30};
        System.out.print("Enhanced for loop: ");
        for (int num : numbers) {
            System.out.print(num + " ");
        }
        System.out.println();

        // while loop
        System.out.print("While loop (countdown 3 to 1): ");
        int countdown = 3;
        while (countdown > 0) {
            System.out.print(countdown + "... ");
            countdown--;
        }
        System.out.println("Liftoff!");

        // do-while loop (executes at least once)
        int x = 5;
        System.out.print("Do-While: ");
        do {
            System.out.print(x + " ");
            x++;
        } while (x < 5);
        System.out.println("\n");
    }

    // 11. METHOD DEMONSTRATING ARRAYS AND COLLECTIONS
    private static void demonstrateArraysAndCollections() {
        System.out.println("--- 3. Arrays and Collections ---");

        // Array (fixed size)
        String[] fruitsArray = {"Apple", "Banana", "Cherry"};
        System.out.print("Array: ");
        for (String fruit : fruitsArray) {
            System.out.print(fruit + " ");
        }
        System.out.println();

        // ArrayList (dynamic size, part of Collections Framework)
        ArrayList<String> fruitList = new ArrayList<>();
        fruitList.add("Apple"); // Add elements
        fruitList.add("Banana");
        fruitList.add("Cherry");
        fruitList.set(2, "Cherry"); // Correct a typo
        fruitList.remove("Banana"); // Remove an element
        fruitList.add(1, "Blueberry"); // Add at specific index

        System.out.println("ArrayList: " + fruitList);
        System.out.println("Size of list: " + fruitList.size());
        System.out.println("Element at index 0: " + fruitList.get(0));

        // HashMap (key-value pairs)
        HashMap<String, Integer> inventory = new HashMap<>();
        inventory.put("Apples", 50);
        inventory.put("Oranges", 25);
        inventory.put("Bananas", 40);

        System.out.println("HashMap: " + inventory);
        System.out.println("Number of Apples: " + inventory.get("Apples"));
        System.out.println();
    }

    // 12. METHOD DEMONSTRATING OOP (CLASSES, OBJECTS, INHERITANCE)
    private static void demonstrateOOP() {
        System.out.println("--- 4. Object-Oriented Programming ---");

        // Create an instance of the main class using its constructor
        JavaDemo demoObject = new JavaDemo("Test Data");

        // Create objects from other classes
        Book book1 = new Book("Effective Java", "Joshua Bloch", 2018, 49.99);
        EBook ebook1 = new EBook("Java: The Complete Reference", "Herbert Schildt", 2022, 35.50, "PDF");

        // Use object methods
        book1.displayInfo();
        ebook1.displayInfo(); // This calls the overridden version

        // Demonstrate polymorphism
        System.out.println("\n--- Polymorphism ---");
        Book[] library = new Book[2];
        library[0] = book1;
        library[1] = ebook1; // EBook "is-a" Book

        for (Book book : library) {
            book.displayInfo(); // Runtime polymorphism - calls the correct version
        }
        System.out.println();
    }

    // 13. METHOD DEMONSTRATING EXCEPTION HANDLING
    private static void demonstrateExceptionHandling() {
        System.out.println("--- 5. Exception Handling ---");

        Scanner scanner = new Scanner(System.in);

        try {
            System.out.print("Enter a number to divide 100 by: ");
            String input = scanner.nextLine();

            // This line could throw a NumberFormatException
            int divisor = Integer.parseInt(input);

            // This line could throw an ArithmeticException
            int result = 100 / divisor;

            System.out.println("100 / " + divisor + " = " + result);

        } catch (NumberFormatException e) {
            System.err.println("Error: That's not a valid number! (" + e.getMessage() + ")");
        } catch (ArithmeticException e) {
            System.err.println("Error: You can't divide by zero!");
        } catch (Exception e) { // Catch any other unexpected exception
            System.err.println("An unexpected error occurred: " + e.getMessage());
        } finally {
            // This block always executes, used for cleanup (like closing resources)
            System.out.println("This 'finally' block always runs.");
            scanner.close(); // It's good practice to close the Scanner
        }
    }
}

// 14. A SEPARATE CLASS (Usually in its own file, but can be in same for demo)
// 'class' is the default modifier (package-private)
class Book {
    // 15. ENCAPSULATION: private fields with public getters/setters
    private String title;
    private String author;
    private int publishYear;
    protected double price; // 'protected' is accessible in subclasses and package

    // 16. CONSTRUCTOR
    public Book(String title, String author, int publishYear, double price) {
        this.title = title;
        this.author = author;
        this.publishYear = publishYear;
        this.price = price;
    }

    // 17. METHODS (Behavior)
    public void displayInfo() {
        System.out.printf("Book: '%s' by %s (%d). $%.2f\n",
                title, author, publishYear, price);
    }

    // 18. GETTERS AND SETTERS (Accessors and Mutators)
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public int getPublishYear() { return publishYear; }
    public void setPublishYear(int publishYear) { this.publishYear = publishYear; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
}

// 19. A SUBCLASS (INHERITANCE) - EBook "is-a" Book
class EBook extends Book {
    private String format;

    // 20. SUBCLASS CONSTRUCTOR using 'super' to call parent constructor
    public EBook(String title, String author, int publishYear, double price, String format) {
        super(title, author, publishYear, price); // Call parent constructor
        this.format = format;
    }

    // 21. METHOD OVERRIDING (Runtime Polymorphism)
    @Override
    public void displayInfo() {
        // super.displayInfo(); // Could call the parent version first
        System.out.printf("EBook: '%s' [%s format]. $%.2f\n",
                getTitle(), format, price); // 'price' is accessible because it's protected
    }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }
}
