import { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Save,
  Trash2,
  Check,
  X,
  Edit3,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { useContext } from "react";
import { AdminContext } from "../context/AdminContext";

const TodoApp = () => {
  const [pages, setPages] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [currentView, setCurrentView] = useState("pages"); // 'pages' or 'tasks'
  const [isEditingPage, setIsEditingPage] = useState(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newTodoText, setNewTodoText] = useState("");
  const { backendUrl } = useContext(AdminContext);

  // Initialize with today's page if none exists
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (!pages.find((page) => page.date === today)) {
      const todayPage = {
        id: Date.now(),
        date: today,
        title: `Tasks for ${new Date(today).toLocaleDateString()}`,
        todos: [],
        isModified: false,
      };
      setPages([todayPage]);
    }
  }, []);

  // Add this new useEffect hook
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch(backendUrl + "/api/todopages");
        const data = await response.json();
        if (data.success) {
          setPages(data.data);
        }
      } catch (error) {
        console.error("Error fetching pages:", error);
      }
    };
    fetchPages();
  }, []); // Empty dependency array to run only once on mount

  // Get current page
  const currentPage = pages.find((page) => page.date === selectedDate);

  // Create new page
  const createPage = async (date) => {
    try {
      const response = await fetch(backendUrl + "/api/todopages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          title: `Tasks for ${new Date(date).toLocaleDateString()}`,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPages([...pages, data.data]);
        setSelectedDate(data.data.date);
        setCurrentView("tasks");
      } else {
        console.error("Failed to create page:", data.message);
      }
    } catch (error) {
      console.error("Error creating page:", error);
    }
  };

  // Delete page
  const deletePage = async (pageId) => {
    try {
      const response = await fetch(backendUrl + `/api/todopages/${pageId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        setPages(pages.filter((page) => page.id !== pageId));
        if (currentPage && currentPage.id === pageId) {
          setCurrentView("pages");
        }
      } else {
        console.error("Failed to delete page:", data.message);
      }
    } catch (error) {
      console.error("Error deleting page:", error);
    }
  };

  // Edit page title
  const editPageTitle = (pageId, newTitle) => {
    setPages(
      pages.map((page) =>
        page.id === pageId
          ? { ...page, title: newTitle, isModified: true }
          : page
      )
    );
    setIsEditingPage(null);
  };

  // Add todo
  const addTodo = async () => {
    if (!newTodoText.trim() || !currentPage) return;
    try {
      const response = await fetch(
        backendUrl + `/api/todopages/${currentPage.id}/todos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: newTodoText.trim() }),
        }
      );
      const data = await response.json();
      if (data.success) {
        // Update the current page with the data from the server
        setPages(
          pages.map((page) => (page.id === currentPage.id ? data.data : page))
        );
        setNewTodoText("");
      } else {
        console.error("Failed to add todo:", data.message);
      }
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  };

  // Toggle todo completion
  const toggleTodo = async (todoId) => {
    if (!currentPage) return;
    const todo = currentPage.todos.find((t) => t.id === todoId);
    if (!todo) return;

    try {
      const response = await fetch(
        backendUrl + `/api/todopages/${currentPage.id}/todos/${todoId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ completed: !todo.completed }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setPages(
          pages.map((page) => (page.id === currentPage.id ? data.data : page))
        );
      } else {
        console.error("Failed to toggle todo:", data.message);
      }
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };

  // Delete todo
  const deleteTodo = async (todoId) => {
    if (!currentPage) return;
    try {
      const response = await fetch(
        backendUrl + `/api/todopages/${currentPage.id}/todos/${todoId}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();
      if (data.success) {
        // The backend returns the updated page after deletion
        setPages(
          pages.map((page) => (page.id === currentPage.id ? data.data : page))
        );
      } else {
        console.error("Failed to delete todo:", data.message);
      }
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  // Save page
  const savePage = async (pageId) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPages(
        pages.map((page) =>
          page.id === pageId ? { ...page, isModified: false } : page
        )
      );
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  // Navigate to page
  const navigateToPage = (page) => {
    setSelectedDate(page.date);
    setCurrentView("tasks");
  };

  // Get sorted pages by date
  const sortedPages = [...pages].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Calculate global stats
  const globalStats = pages.reduce(
    (acc, page) => {
      acc.totalTasks += page.todos.length;
      acc.completedTasks += page.todos.filter((t) => t.completed).length;
      acc.pendingTasks += page.todos.filter((t) => !t.completed).length;
      return acc;
    },
    { totalTasks: 0, completedTasks: 0, pendingTasks: 0 }
  );

  const currentPageStats = currentPage
    ? {
        totalTasks: currentPage.todos.length,
        completedTasks: currentPage.todos.filter((t) => t.completed).length,
        pendingTasks: currentPage.todos.filter((t) => !t.completed).length,
      }
    : { totalTasks: 0, completedTasks: 0, pendingTasks: 0 };

  const completionRate =
    currentPageStats.totalTasks > 0
      ? Math.round(
          (currentPageStats.completedTasks / currentPageStats.totalTasks) * 100
        )
      : 0;

  // Pages View
  if (currentView === "pages") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header with Global Stats */}
        <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
          <div className="px-4 py-4 sm:px-6 sm:py-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 sm:p-3 rounded-xl shadow-lg">
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900">
                      Daily Todo Manager
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-1 hidden sm:block">
                      Stay organized and productive every day
                    </p>
                  </div>
                </div>
              </div>

              {/* Global Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-blue-200">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">
                    {globalStats.totalTasks}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    Total Tasks
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-green-200">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {globalStats.completedTasks}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    Completed
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-orange-200">
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">
                    {globalStats.pendingTasks}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    Pending
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 sm:px-6">
          {/* Add New Page Section */}
          <div className="mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                Create New Page
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 sm:p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  onClick={() => createPage(selectedDate)}
                  disabled={pages.find((page) => page.date === selectedDate)}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 sm:p-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 flex items-center justify-center gap-2 font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  {pages.find((page) => page.date === selectedDate)
                    ? "Page Already Exists"
                    : "Create Page"}
                </button>
              </div>
            </div>
          </div>

          {/* Pages List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                All Pages ({pages.length})
              </h3>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {sortedPages.length === 0 ? (
                <div className="text-center py-12 sm:py-20">
                  <div className="bg-gray-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg sm:text-2xl font-semibold text-gray-600 mb-2">
                    No pages yet
                  </h3>
                  <p className="text-gray-500 text-sm sm:text-base">
                    Create your first page to get started!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sortedPages.map((page) => {
                    const pageCompletedTasks = page.todos.filter(
                      (t) => t.completed
                    ).length;
                    const pageCompletionRate =
                      page.todos.length > 0
                        ? Math.round(
                            (pageCompletedTasks / page.todos.length) * 100
                          )
                        : 0;

                    return (
                      <div
                        key={page.id}
                        className="p-4 sm:p-6 hover:bg-gray-50 transition-all cursor-pointer"
                        onClick={() => navigateToPage(page)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                              <span className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                {new Date(page.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                              {page.isModified && (
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                              )}
                            </div>

                            <h4 className="text-sm sm:text-lg font-semibold text-gray-900 truncate mb-1">
                              {page.title}
                            </h4>

                            <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500">
                              <span>{page.todos.length} tasks</span>
                              <span>{pageCompletedTasks} completed</span>
                              {page.todos.length > 0 && (
                                <span className="text-green-600 font-medium">
                                  {pageCompletionRate}%
                                </span>
                              )}
                            </div>

                            {/* Progress Bar */}
                            {page.todos.length > 0 && (
                              <div className="mt-3 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                                  style={{ width: `${pageCompletionRate}%` }}
                                ></div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {page.isModified && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  savePage(page.id);
                                }}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePage(page.id);
                              }}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete Page"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tasks View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView("pages")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div className="flex-1 min-w-0">
                {isEditingPage === currentPage?.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPageTitle}
                      onChange={(e) => setNewPageTitle(e.target.value)}
                      className="flex-1 text-lg sm:text-xl font-bold p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        editPageTitle(currentPage.id, newPageTitle)
                      }
                      autoFocus
                    />
                    <button
                      onClick={() =>
                        editPageTitle(currentPage.id, newPageTitle)
                      }
                      className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsEditingPage(null)}
                      className="p-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      {currentPage?.title || "No Page Selected"}
                    </h2>
                    {currentPage && (
                      <button
                        onClick={() => {
                          setNewPageTitle(currentPage.title);
                          setIsEditingPage(currentPage.id);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {currentPage?.isModified && (
                <button
                  onClick={() => savePage(currentPage.id)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 flex items-center gap-2 font-medium transition-all shadow-lg hover:shadow-xl text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              )}
            </div>

            {/* Current Page Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-blue-200">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                  {currentPageStats.totalTasks}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">
                  Total
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-green-200">
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {currentPageStats.completedTasks}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">
                  Done
                </div>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-orange-200">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">
                  {currentPageStats.pendingTasks}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">
                  Pending
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {currentPageStats.totalTasks > 0 && (
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6">
        {currentPage ? (
          <>
            {/* Add Todo Form */}
            <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder="What needs to be done?"
                  className="flex-1 p-3 sm:p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  onKeyPress={(e) => e.key === "Enter" && addTodo()}
                />
                <button
                  onClick={addTodo}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 sm:py-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 flex items-center justify-center gap-2 font-medium transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Add Task
                </button>
              </div>
            </div>

            {/* Todo List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Tasks ({currentPage.todos.length})
                </h3>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {currentPage.todos.length === 0 ? (
                  <div className="text-center py-12 sm:py-20">
                    <div className="bg-gray-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg sm:text-2xl font-semibold text-gray-600 mb-2">
                      No tasks yet
                    </h3>
                    <p className="text-gray-500 text-sm sm:text-base">
                      Add your first task above to get started!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {currentPage.todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-6 transition-all ${
                          todo.completed
                            ? "bg-gray-50 opacity-75"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            todo.completed
                              ? "bg-green-500 border-green-500 text-white shadow-sm"
                              : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                          }`}
                        >
                          {todo.completed && (
                            <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                        </button>

                        <span
                          className={`flex-1 text-sm sm:text-base min-w-0 ${
                            todo.completed
                              ? "line-through text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {todo.text}
                        </span>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-xs text-gray-400 font-medium hidden sm:block">
                            {new Date(todo.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>

                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="p-1.5 sm:p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 sm:py-20">
            <div className="bg-gray-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-2xl font-semibold text-gray-600 mb-3">
              No page selected
            </h3>
            <p className="text-gray-500 mb-8 text-sm sm:text-base">
              Go back and select a page to view tasks
            </p>
            <button
              onClick={() => setCurrentView("pages")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 flex items-center gap-2 mx-auto font-medium transition-all shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              Back to Pages
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoApp;
