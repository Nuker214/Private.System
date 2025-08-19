/*
 * ================================================
 * A COMPREHENSIVE C LANGUAGE EXAMPLE
 * ================================================
 */

/* 1. PREPROCESSOR DIRECTIVES */
#include <stdio.h>   // For input/output (printf, scanf)
#include <string.h>  // For string functions (strlen, strcmp)
#include <stdlib.h>  // For memory allocation (malloc, free) and exit()
#define MAX_BOOKS 5  // A macro definition (text replacement)
#define GREETING "Welcome to the Library System"

/* 2. STRUCT DECLARATION (A custom data type) */
struct Book {
    char title[50];
    char author[50];
    int year;
    float price;
};

/* 3. FUNCTION PROTOTYPES (Declarations) */
void demonstrate_variables_and_io();
void demonstrate_control_flow();
void demonstrate_arrays_and_pointers();
void demonstrate_structures();
void demonstrate_memory_allocation();
int factorial(int n); // A simple recursive function

/* 4. THE main() FUNCTION - PROGRAM ENTRY POINT */
int main() {
    printf("=== %s ===\n\n", GREETING);

    demonstrate_variables_and_io();
    demonstrate_control_flow();
    demonstrate_arrays_and_pointers();
    demonstrate_structures();
    demonstrate_memory_allocation();

    printf("\n=== Program Finished Successfully ===\n");
    return 0; // Return 0 to the operating system to indicate success.
}

/* 5. FUNCTION DEFINITIONS */

void demonstrate_variables_and_io() {
    printf("--- 1. Variables and Basic I/O ---\n");

    // Primitive data type declaration and initialization
    int age = 30;                 // Integer
    float height = 1.85f;         // Floating-point number
    double precise_height = 1.851234; // Double-precision floating-point
    char initial = 'A';           // Single character
    _Bool is_programmer = 1;      // Boolean (0 is false, non-zero is true)

    // Print the variables
    printf("Age: %d\n", age);
    printf("Height: %.2f meters (%.4f precise)\n", height, precise_height);
    printf("Initial: %c\n", initial);
    printf("Is a programmer: %d\n", is_programmer);

    // Simple input (commented out to avoid stopping the demo)
    // int user_input;
    // printf("Enter a number: ");
    // scanf("%d", &user_input); // & is the "address-of" operator
    // printf("You entered: %d\n\n", user_input);
    printf("\n");
}

void demonstrate_control_flow() {
    printf("--- 2. Control Flow (if/else, switch, loops) ---\n");

    int number = 10;

    // if-else if-else statement
    if (number > 10) {
        printf("%d is greater than 10.\n", number);
    } else if (number < 10) {
        printf("%d is less than 10.\n", number);
    } else {
        printf("%d is exactly 10.\n", number);
    }

    // switch statement
    int choice = 2;
    switch (choice) {
        case 1:
            printf("You chose option 1.\n");
            break; // 'break' is crucial to exit the switch
        case 2:
            printf("You chose option 2.\n");
            break;
        default:
            printf("Invalid choice.\n");
            break;
    }

    // for loop
    printf("For loop (0 to 4): ");
    for (int i = 0; i < 5; i++) {
        printf("%d ", i);
    }
    printf("\n");

    // while loop
    printf("While loop (countdown 3 to 1): ");
    int countdown = 3;
    while (countdown > 0) {
        printf("%d... ", countdown);
        countdown--;
    }
    printf("Liftoff!\n");

    // do-while loop (executes at least once)
    int x = 5;
    printf("Do-While: ");
    do {
        printf("%d ", x);
        x++;
    } while (x < 5); // Condition is false, but body ran once.
    printf("\n\n");
}

void demonstrate_arrays_and_pointers() {
    printf("--- 3. Arrays, Strings, and Pointers ---\n");

    // Array
    int numbers[] = {10, 20, 30, 40, 50}; // Size inferred from initializer
    int array_size = sizeof(numbers) / sizeof(numbers[0]); // Calculate number of elements

    printf("Array elements: ");
    for (int i = 0; i < array_size; i++) {
        printf("%d ", numbers[i]);
    }
    printf("\n");

    // String (is an array of chars, terminated with null character '\\0')
    char greeting[] = "Hello"; // Automatically adds '\0'
    printf("String: %s (Length: %lu)\n", greeting, strlen(greeting));

    // Pointers - variables that store memory addresses
    int num = 42;
    int *num_pointer = &num; // & gets the address of 'num'

    printf("Value of num: %d\n", num);
    printf("Address of num: %p\n", (void*)&num); // %p prints pointers
    printf("Value of num_pointer: %p\n", (void*)num_pointer);
    printf("Value pointed to by num_pointer: %d\n\n", *num_pointer); // * dereferences the pointer
}

void demonstrate_structures() {
    printf("--- 4. Structures (Custom Types) ---\n");

    // Declare and initialize a struct
    struct Book book1 = {"The C Programming Language", "K&R", 1978, 49.99};
    struct Book book2;

    // Assign values to struct members using the dot operator
    strcpy(book2.title, "C: The Complete Reference");
    strcpy(book2.author, "Herbert Schildt");
    book2.year = 2017;
    book2.price = 35.50;

    // Create an array of structs
    struct Book library[MAX_BOOKS] = {book1, book2};

    // Print the library catalog
    printf("Library Catalog:\n");
    for (int i = 0; i < 2; i++) { // Only loop through the 2 books we filled
        printf("Book %d: %s by %s (%d). $%.2f\n",
               i + 1,
               library[i].title,
               library[i].author,
               library[i].year,
               library[i].price);
    }
    printf("\n");
}

void demonstrate_memory_allocation() {
    printf("--- 5. Dynamic Memory Allocation ---\n");

    int *dynamic_array;
    int size;

    printf("How many numbers do you want to store? ");
    scanf("%d", &size);

    // Allocate memory on the heap using malloc
    // sizeof(*dynamic_array) is the size of what the pointer points to (an int)
    dynamic_array = (int *)malloc(size * sizeof(*dynamic_array));

    // Check if allocation succeeded
    if (dynamic_array == NULL) {
        printf("Memory allocation failed! Exiting.\n");
        exit(1); // Exit the program with an error code
    }

    printf("Enter %d numbers:\n", size);
    for (int i = 0; i < size; i++) {
        printf("Number %d: ", i + 1);
        scanf("%d", &dynamic_array[i]); // & is needed as scanf expects an address
    }

    printf("You entered: ");
    for (int i = 0; i < size; i++) {
        printf("%d ", dynamic_array[i]);
    }
    printf("\n");

    // Demonstrate the recursive factorial function
    printf("Factorial of %d (calculated recursively) is %d\n", size, factorial(size));

    // CRITICAL: Free the allocated memory to avoid memory leaks
    free(dynamic_array);
    printf("Dynamically allocated memory has been freed.\n\n");
}

// A recursive function to calculate factorial
// factorial(5) = 5 * 4 * 3 * 2 * 1
int factorial(int n) {
    if (n == 0 || n == 1) { // Base case to stop recursion
        return 1;
    } else {
        return n * factorial(n - 1); // Function calls itself
    }
}

/*
 * ================================================
 * A COMPREHENSIVE C LANGUAGE EXAMPLE
 * ================================================
 */

/* 1. PREPROCESSOR DIRECTIVES */
#include <stdio.h>   // For input/output (printf, scanf)
#include <string.h>  // For string functions (strlen, strcmp)
#include <stdlib.h>  // For memory allocation (malloc, free) and exit()
#define MAX_BOOKS 5  // A macro definition (text replacement)
#define GREETING "Welcome to the Library System"

/* 2. STRUCT DECLARATION (A custom data type) */
struct Book {
    char title[50];
    char author[50];
    int year;
    float price;
};

/* 3. FUNCTION PROTOTYPES (Declarations) */
void demonstrate_variables_and_io();
void demonstrate_control_flow();
void demonstrate_arrays_and_pointers();
void demonstrate_structures();
void demonstrate_memory_allocation();
int factorial(int n); // A simple recursive function

/* 4. THE main() FUNCTION - PROGRAM ENTRY POINT */
int main() {
    printf("=== %s ===\n\n", GREETING);

    demonstrate_variables_and_io();
    demonstrate_control_flow();
    demonstrate_arrays_and_pointers();
    demonstrate_structures();
    demonstrate_memory_allocation();

    printf("\n=== Program Finished Successfully ===\n");
    return 0; // Return 0 to the operating system to indicate success.
}

/* 5. FUNCTION DEFINITIONS */

void demonstrate_variables_and_io() {
    printf("--- 1. Variables and Basic I/O ---\n");

    // Primitive data type declaration and initialization
    int age = 30;                 // Integer
    float height = 1.85f;         // Floating-point number
    double precise_height = 1.851234; // Double-precision floating-point
    char initial = 'A';           // Single character
    _Bool is_programmer = 1;      // Boolean (0 is false, non-zero is true)

    // Print the variables
    printf("Age: %d\n", age);
    printf("Height: %.2f meters (%.4f precise)\n", height, precise_height);
    printf("Initial: %c\n", initial);
    printf("Is a programmer: %d\n", is_programmer);

    // Simple input (commented out to avoid stopping the demo)
    // int user_input;
    // printf("Enter a number: ");
    // scanf("%d", &user_input); // & is the "address-of" operator
    // printf("You entered: %d\n\n", user_input);
    printf("\n");
}

void demonstrate_control_flow() {
    printf("--- 2. Control Flow (if/else, switch, loops) ---\n");

    int number = 10;

    // if-else if-else statement
    if (number > 10) {
        printf("%d is greater than 10.\n", number);
    } else if (number < 10) {
        printf("%d is less than 10.\n", number);
    } else {
        printf("%d is exactly 10.\n", number);
    }

    // switch statement
    int choice = 2;
    switch (choice) {
        case 1:
            printf("You chose option 1.\n");
            break; // 'break' is crucial to exit the switch
        case 2:
            printf("You chose option 2.\n");
            break;
        default:
            printf("Invalid choice.\n");
            break;
    }

    // for loop
    printf("For loop (0 to 4): ");
    for (int i = 0; i < 5; i++) {
        printf("%d ", i);
    }
    printf("\n");

    // while loop
    printf("While loop (countdown 3 to 1): ");
    int countdown = 3;
    while (countdown > 0) {
        printf("%d... ", countdown);
        countdown--;
    }
    printf("Liftoff!\n");

    // do-while loop (executes at least once)
    int x = 5;
    printf("Do-While: ");
    do {
        printf("%d ", x);
        x++;
    } while (x < 5); // Condition is false, but body ran once.
    printf("\n\n");
}

void demonstrate_arrays_and_pointers() {
    printf("--- 3. Arrays, Strings, and Pointers ---\n");

    // Array
    int numbers[] = {10, 20, 30, 40, 50}; // Size inferred from initializer
    int array_size = sizeof(numbers) / sizeof(numbers[0]); // Calculate number of elements

    printf("Array elements: ");
    for (int i = 0; i < array_size; i++) {
        printf("%d ", numbers[i]);
    }
    printf("\n");

    // String (is an array of chars, terminated with null character '\\0')
    char greeting[] = "Hello"; // Automatically adds '\0'
    printf("String: %s (Length: %lu)\n", greeting, strlen(greeting));

    // Pointers - variables that store memory addresses
    int num = 42;
    int *num_pointer = &num; // & gets the address of 'num'

    printf("Value of num: %d\n", num);
    printf("Address of num: %p\n", (void*)&num); // %p prints pointers
    printf("Value of num_pointer: %p\n", (void*)num_pointer);
    printf("Value pointed to by num_pointer: %d\n\n", *num_pointer); // * dereferences the pointer
}

void demonstrate_structures() {
    printf("--- 4. Structures (Custom Types) ---\n");

    // Declare and initialize a struct
    struct Book book1 = {"The C Programming Language", "K&R", 1978, 49.99};
    struct Book book2;

    // Assign values to struct members using the dot operator
    strcpy(book2.title, "C: The Complete Reference");
    strcpy(book2.author, "Herbert Schildt");
    book2.year = 2017;
    book2.price = 35.50;

    // Create an array of structs
    struct Book library[MAX_BOOKS] = {book1, book2};

    // Print the library catalog
    printf("Library Catalog:\n");
    for (int i = 0; i < 2; i++) { // Only loop through the 2 books we filled
        printf("Book %d: %s by %s (%d). $%.2f\n",
               i + 1,
               library[i].title,
               library[i].author,
               library[i].year,
               library[i].price);
    }
    printf("\n");
}

void demonstrate_memory_allocation() {
    printf("--- 5. Dynamic Memory Allocation ---\n");

    int *dynamic_array;
    int size;

    printf("How many numbers do you want to store? ");
    scanf("%d", &size);

    // Allocate memory on the heap using malloc
    // sizeof(*dynamic_array) is the size of what the pointer points to (an int)
    dynamic_array = (int *)malloc(size * sizeof(*dynamic_array));

    // Check if allocation succeeded
    if (dynamic_array == NULL) {
        printf("Memory allocation failed! Exiting.\n");
        exit(1); // Exit the program with an error code
    }

    printf("Enter %d numbers:\n", size);
    for (int i = 0; i < size; i++) {
        printf("Number %d: ", i + 1);
        scanf("%d", &dynamic_array[i]); // & is needed as scanf expects an address
    }

    printf("You entered: ");
    for (int i = 0; i < size; i++) {
        printf("%d ", dynamic_array[i]);
    }
    printf("\n");

    // Demonstrate the recursive factorial function
    printf("Factorial of %d (calculated recursively) is %d\n", size, factorial(size));

    // CRITICAL: Free the allocated memory to avoid memory leaks
    free(dynamic_array);
    printf("Dynamically allocated memory has been freed.\n\n");
}

// A recursive function to calculate factorial
// factorial(5) = 5 * 4 * 3 * 2 * 1
int factorial(int n) {
    if (n == 0 || n == 1) { // Base case to stop recursion
        return 1;
    } else {
        return n * factorial(n - 1); // Function calls itself
    }
}
