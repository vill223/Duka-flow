import React, { useEffect, { useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const STORAGE_KEY = '@duka_flow_v2';

const initialData = {
  products: [],
  sales: [],
  expenses: [],
  customers: [],
};

export default function App() {
  const [data, setData] = useState(initialData);
  const [screen, setScreen] = useState('Home');
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockLimit, setLowStockLimit] = useState('5');
  const [productImage, setProductImage] = useState(null);

  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCredit, setCustomerCredit] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      ).catch(() => {});
    }
  }, [data, loaded]);

  async function loadData() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved) {
        setData(JSON.parse(saved));
      }
    } catch (error) {
      Alert.alert(
        'Storage error',
        'Saved information could not be loaded.'
      );
    } finally {
      setLoaded(true);
    }
  }

  async function chooseImage() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo access to add product pictures.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

    if (!result.canceled) {
      setProductImage(result.assets[0].uri);
    }
  }

  function resetProductForm() {
    setProductName('');
    setCategory('');
    setBuyPrice('');
    setSellPrice('');
    setStock('');
    setLowStockLimit('5');
    setProductImage(null);
  }

  function addProduct() {
    if (!productName || !buyPrice || !sellPrice || !stock) {
      Alert.alert(
        'Missing information',
        'Please fill in the product name, prices and stock.'
      );
      return;
    }

    const buy = Number(buyPrice);
    const sell = Number(sellPrice);
    const quantity = Number(stock);
    const limit = Number(lowStockLimit) || 5;

    if (
      Number.isNaN(buy) ||
      Number.isNaN(sell) ||
      Number.isNaN(quantity)
    ) {
      Alert.alert(
        'Invalid information',
        'Please enter valid numbers.'
      );
      return;
    }

    const product = {
      id: Date.now(),
      name: productName.trim(),
      category: category.trim() || 'General',
      buy,
      sell,
      stock: quantity,
      lowStockLimit: limit,
      image: productImage,
    };

    setData(prev => ({
      ...prev,
      products: [...prev.products, product],
    }));

    resetProductForm();
    setScreen('Inventory');

    Alert.alert('Saved', `${product.name} was added.`);
  }

  function deleteProduct(id) {
    Alert.alert(
      'Delete product?',
      'This will remove the product from inventory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setData(prev => ({
              ...prev,
              products: prev.products.filter(
                product => product.id !== id
              ),
            }));
          },
        },
      ]
    );
  }

  function addToCart(product) {
    if (product.stock <= 0) {
      Alert.alert(
        'Out of stock',
        `${product.name} is out of stock.`
      );
      return;
    }

    setCart(prev => {
      const existing = prev.find(
        item => item.id === product.id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          Alert.alert(
            'Stock limit',
            'There is not enough stock.'
          );
          return prev;
        }

        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.sell,
          buy: product.buy,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(id) {
    setCart(prev =>
      prev
        .map(item =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartProfit = cart.reduce(
    (sum, item) =>
      sum + (item.price - item.buy) * item.quantity,
    0
  );

  function completeSale() {
    if (cart.length === 0) {
      Alert.alert(
        'Empty cart',
        'Add a product before completing the sale.'
      );
      return;
    }

    for (const item of cart) {
      const product = data.products.find(
        p => p.id === item.id
      );

      if (!product || item.quantity > product.stock) {
        Alert.alert(
          'Stock problem',
          `${item.name} does not have enough stock.`
        );
        return;
      }
    }

    const sale = {
      id: Date.now(),
      items: cart,
      total: cartTotal,
      profit: cartProfit,
      date: new Date().toISOString(),
    };

    const updatedProducts = data.products.map(product => {
      const item = cart.find(
        cartItem => cartItem.id === product.id
      );

      if (!item) return product;

      return {
        ...product,
        stock: product.stock - item.quantity,
      };
    });

    setData(prev => ({
      ...prev,
      products: updatedProducts,
      sales: [...prev.sales, sale],
    }));

    setCart([]);
    setScreen('Home');

    Alert.alert(
      'Sale completed',
      `UGX ${cartTotal.toLocaleString()} recorded.`
    );
  }

  function addExpense() {
    const amount = Number(expenseAmount);

    if (!expenseName || !amount || amount <= 0) {
      Alert.alert(
        'Invalid expense',
        'Enter an expense name and amount.'
      );
      return;
    }

    const expense = {
      id: Date.now(),
      name: expenseName,
      amount,
      date: new Date().toISOString(),
    };

    setData(prev => ({
      ...prev,
      expenses: [...prev.expenses, expense],
    }));

    setExpenseName('');
    setExpenseAmount('');

    Alert.alert('Saved', 'Expense recorded.');
  }

  function addCustomer() {
    if (!customerName) {
      Alert.alert(
        'Missing name',
        'Enter the customer name.'
      );
      return;
    }

    const customer = {
      id: Date.now(),
      name: customerName,
      phone: customerPhone,
      credit: Number(customerCredit) || 0,
    };

    setData(prev => ({
      ...prev,
      customers: [...prev.customers, customer],
    }));

    setCustomerName('');
    setCustomerPhone('');
    setCustomerCredit('');

    Alert.alert('Saved', `${customer.name} was added.`);
  }

  const totals = useMemo(() => {
    const sales = data.sales.reduce(
      (sum, sale) => sum + sale.total,
      0
    );

    const profit = data.sales.reduce(
      (sum, sale) => sum + sale.profit,
      0
    );

    const expenses = data.expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    const stockValue = data.products.reduce(
      (sum, product) =>
        sum + product.buy * product.stock,
      0
    );

    const lowStock = data.products.filter(
      product =>
        product.stock <= product.lowStockLimit
    );

    const credit = data.customers.reduce(
      (sum, customer) => sum + customer.credit,
      0
    );

    return {
      sales,
      profit,
      expenses,
      netProfit: profit - expenses,
      stockValue,
      lowStock,
      credit,
    };
  }, [data]);

  const filteredProducts = data.products.filter(
    product =>
      product.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      product.category
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  function riskLevel() {
    let risks = totals.lowStock.length;

    risks += data.products.filter(
      product => product.sell <= product.buy
    ).length;

    risks += data.customers.filter(
      customer => customer.credit > 0
    ).length;

    if (risks === 0) return 'LOW';
    if (risks <= 3) return 'MEDIUM';
    return 'HIGH';
  }

  const risk = riskLevel();

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Duka Flow</Text>
          <Text style={styles.headerSub}>
            Smart business management
          </Text>
        </View>

        <View style={styles.logo}>
          <Text style={styles.logoText}>DF</Text>
        </View>
      </View>

      {screen === 'Home' && (
        <ScrollView style={styles.content}>
          <Text style={styles.greeting}>
            Business overview
          </Text>

          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>
              Today's sales
            </Text>

            <Text style={styles.heroAmount}>
              UGX {totals.sales.toLocaleString()}
            </Text>

            <Text style={styles.heroProfit}>
              Profit: UGX {totals.profit.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                Products
              </Text>
              <Text style={styles.statNumber}>
                {data.products.length}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                Stock value
              </Text>
              <Text style={styles.statNumberSmall}>
                UGX {totals.stockValue.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                Expenses
              </Text>
              <Text style={styles.statNumberSmall}>
                UGX {totals.expenses.toLocaleString()}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>
                Net profit
              </Text>
              <Text style={styles.statNumberSmall}>
                UGX {totals.netProfit.toLocaleString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.sellButton}
            onPress={() => setScreen('Sell')}
          >
            <Text style={styles.sellButtonText}>
              + Record a Sale
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            Risk & Loss
          </Text>

          <View style={styles.riskCard}>
            <Text style={styles.riskTitle}>
              {risk === 'LOW'
                ? '🟢 LOW RISK'
                : risk === 'MEDIUM'
                ? '🟡 MEDIUM RISK'
                : '🔴 HIGH RISK'}
            </Text>

            <Text style={styles.riskText}>
              {totals.lowStock.length} low-stock products
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            Low Stock
          </Text>

          {totals.lowStock.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text>
                🎉 All products have healthy stock.
              </Text>
            </View>
          ) : (
            totals.lowStock.map(product => (
              <View
                style={styles.listCard}
                key={product.id}
              >
                <Text style={styles.listTitle}>
                  {product.name}
                </Text>
                <Text>
                  Only {product.stock} left
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {screen === 'Inventory' && (
        <ScrollView style={styles.content}>
          <Text style={styles.pageTitle}>
            Inventory
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setScreen('AddProduct')}
          >
            <Text style={styles.primaryButtonText}>
              + Add Product
            </Text>
          </TouchableOpacity>

          {filteredProducts.map(product => (
            <View
              style={styles.productCard}
              key={product.id}
            >
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>
                    📦
                  </Text>
                </View>
              )}

              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>
                  {product.name}
                </Text>

                <Text style={styles.category}>
                  {product.category}
                </Text>

                <Text>
                  Sell: UGX{' '}
                  {product.sell.toLocaleString()}
                </Text>

                <Text>
                  Stock: {product.stock}
                </Text>

                {product.stock <=
                  product.lowStockLimit && (
                  <Text style={styles.warning}>
                    ⚠ Low stock
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteSmall}
                onPress={() =>
                  deleteProduct(product.id)
                }
              >
                <Text>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {screen === 'AddProduct' && (
        <ScrollView style={styles.content}>
          <Text style={styles.pageTitle}>
            Add Product
          </Text>

          <TouchableOpacity
            style={styles.photoButton}
            onPress={chooseImage}
          >
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={styles.selectedImage}
              />
            ) : (
              <>
                <Text style={styles.cameraIcon}>
                  📷
                </Text>
                <Text>
                  Add product photo
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Product name"
            value={productName}
            onChangeText={setProductName}
          />

          <TextInput
            style={styles.input}
            placeholder="Category"
            value={category}
            onChangeText={setCategory}
          />

          <TextInput
            style={styles.input}
            placeholder="Buying price"
            keyboardType="numeric"
            value={buyPrice}
            onChangeText={setBuyPrice}
          />

          <TextInput
            style={styles.input}
            placeholder="Selling price"
            keyboardType="numeric"
            value={sellPrice}
            onChangeText={setSellPrice}
          />

          <TextInput
            style={styles.input}
            placeholder="Quantity in stock"
            keyboardType="numeric"
            value={stock}
            onChangeText={setStock}
          />

          <TextInput
            style={styles.input}
            placeholder="Low-stock warning level"
            keyboardType="numeric"
            value={lowStockLimit}
            onChangeText={setLowStockLimit}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={addProduct}
          >
            <Text style={styles.primaryButtonText}>
              Save Product
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {screen === 'Sell' && (
        <ScrollView style={styles.content}>
          <Text style={styles.pageTitle}>
            Sell
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
          />

          <View style={styles.grid}>
            {filteredProducts.map(product => (
              <TouchableOpacity
                style={styles.sellProduct}
                key={product.id}
                onPress={() => addToCart(product)}
              >
                {product.image ? (
                  <Image
                    source={{ uri: product.image }}
                    style={styles.sellImage}
                  />
                ) : (
                  <View style={styles.sellPlaceholder}>
                    <Text>📦</Text>
                  </View>
                )}

                <Text
                  style={styles.sellProductName}
                  numberOfLines={1}
                >
                  {product.name}
                </Text>

                <Text style={styles.sellPrice}>
                  UGX {product.sell.toLocaleString()}
                </Text>

                <Text>
                  {product.stock} available
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            Cart
          </Text>

          {cart.map(item => (
            <View
              style={styles.cartItem}
              key={item.id}
            >
              <View>
                <Text style={styles.listTitle}>
                  {item.name}
                </Text>

                <Text>
                  {item.quantity} × UGX{' '}
                  {item.price.toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() =>
                  removeFromCart(item.id)
                }
              >
                <Text>−</Text>
              </TouchableOpacity>
            </View>
          ))}

          {cart.length > 0 && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>
                Total
              </Text>

              <Text style={styles.totalAmount}>
                UGX {cartTotal.toLocaleString()}
              </Text>

              <Text>
                Profit: UGX {cartProfit.toLocaleString()}
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={completeSale}
              >
                <Text style={styles.primaryButtonText}>
                  Complete Sale
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {screen === 'Expenses' && (
        <ScrollView style={styles.content}>
          <Text style={styles.pageTitle}>
            Expenses
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Expense name"
            value={expenseName}
            onChangeText={setExpenseName}
          />

          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={addExpense}
          >
            <Text style={styles.primaryButtonText}>
              Save Expense
            </Text>
          </TouchableOpacity>

          <View style={styles.totalCard}>
            <Text style={styles.totalAmount}>
              UGX {totals.expenses.toLocaleString()}
            </Text>
          </View>
        </ScrollView>
      )}

      {screen === 'Customers' && (
        <ScrollView style={styles.content}>
          <Text style={styles.pageTitle}>
            Customers
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Customer name"
            value={customerName}
            onChangeText={setCustomerName}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone number"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
          />

          <TextInput
            style={styles.input}
            placeholder="Credit / amount owed"
            keyboardType="numeric"
            value={customerCredit}
            onChangeText={setCustomerCredit}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={addCustomer}
          >
            <Text style={styles.primaryButtonText}>
              Save Customer
            </Text>
          </TouchableOpacity>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>
              Outstanding credit
            </Text>

            <Text style={styles.totalAmount}>
              UGX {totals.credit.toLocaleString()}
            </Text>
          </View>

          {data.customers.map(customer => (
            <View
              style={styles.listCard}
              key={customer.id}
            >
              <Text style={styles.listTitle}>
                {customer.name}
              </Text>

              <Text>
                {customer.phone || 'No phone added'}
              </Text>

              <Text>
                Credit: UGX{' '}
                {customer.credit.toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {screen === 'Reports' && (
        <ScrollView style={styles.content}>
          <Text style={styles.pageTitle}>
            Reports
          </Text>

          <View style={styles.reportCard}>
            <Text>Sales</Text>
            <Text style={styles.reportNumber}>
              UGX {totals.sales.toLocaleString()}
            </Text>
          </View>

          <View style={styles.reportCard}>
            <Text>Gross Profit</Text>
            <Text style={styles.reportNumber}>
              UGX {totals.profit.toLocaleString()}
            </Text>
          </View>

          <View style={styles.reportCard}>
            <Text>Expenses</Text>
            <Text style={styles.reportNumber}>
              UGX {totals.expenses.toLocaleString()}
            </Text>
          </View>

          <View style={styles.reportCard}>
            <Text>Net Profit</Text>
            <Text style={styles.reportNumber}>
              UGX {totals.netProfit.toLocaleString()}
            </Text>
          </View>
        </ScrollView>
      )}

      {screen === 'Risk' && (
        <ScrollView style={styles.content}>
          <Text style={styles.pageTitle}>
            Risk & Loss
          </Text>

          <View style={styles.riskBigCard}>
            <Text style={styles.riskBigTitle}>
              {risk === 'LOW'
                ? '🟢 LOW RISK'
                : risk === 'MEDIUM'
                ? '🟡 MEDIUM RISK'
                : '🔴 HIGH RISK'}
            </Text>
          </View>

          {totals.lowStock.map(product => (
            <View
              style={styles.warningCard}
              key={product.id}
            >
              <Text style={styles.listTitle}>
                ⚠ {product.name}
              </Text>

              <Text>
                Stock is down to {product.stock}.
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {screen === 'Marketing' && (
        <ScrollView style={styles.content}>
          <Text style={styles.pageTitle}>
            Marketing
          </Text>

          <View style={styles.marketingHero}>
            <Text style={styles.marketingTitle}>
              Promote your products
            </Text>

            <Text style={styles.marketingText}>
              Create promotions using your product
              pictures and prices.
            </Text>
          </View>

          {data.products.map(product => (
            <View
              style={styles.marketingCard}
              key={product.id}
            >
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  style={styles.marketingImage}
                />
              ) : (
                <View style={styles.marketingPlaceholder}>
                  <Text>📦</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>
                  {product.name}
                </Text>

                <Text>
                  UGX {product.sell.toLocaleString()}
                </Text>

                <Text style={styles.caption}>
                  🔥 {product.name} available now
                  for UGX{' '}
                  {product.sell.toLocaleString()}.
                </Text>

                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() =>
                    Alert.alert(
                      'Promotion ready',
                      'Your promotion is ready to share.'
                    )
                  }
                >
                  <Text style={styles.shareText}>
                    Share Promotion
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.nav}>
        <NavButton
          label="Home"
          icon="⌂"
          active={screen === 'Home'}
          onPress={() => setScreen('Home')}
        />

        <NavButton
          label="Stock"
          icon="▦"
          active={screen === 'Inventory'}
          onPress={() => setScreen('Inventory')}
        />

        <NavButton
          label="Sell"
          icon="+"
          active={screen === 'Sell'}
          onPress={() => setScreen('Sell')}
        />

        <NavButton
          label="Reports"
          icon="▥"
          active={screen === 'Reports'}
          onPress={() => setScreen('Reports')}
        />

        <NavButton
          label="More"
          icon="•••"
          active={
            [
              'Expenses',
              'Customers',
              'Risk',
              'Marketing',
            ].includes(screen)
          }
          onPress={() => setScreen('More')}
        />
      </View>

      {screen === 'More' && (
        <View style={styles.moreOverlay}>
          <View style={styles.morePanel}>
            <Text style={styles.pageTitle}>
              More
            </Text>

            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setScreen('Expenses')}
            >
              <Text>💸 Expenses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setScreen('Customers')}
            >
              <Text>👥 Customers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setScreen('Risk')}
            >
              <Text>🛡️ Risk & Loss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setScreen('Marketing')}
            >
              <Text>📣 Marketing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setScreen('Home')}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function NavButton({
  label,
  icon,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.navButton}
      onPress={onPress}
    >
      <Text
        style={[
          styles.navIcon,
          active && styles.navActive,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.navLabel,
          active && styles.navActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F6',
  },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brand: {
    fontSize: 27,
    fontWeight: '800',
  },

  headerSub: {
    color: '#777',
    marginTop: 3,
  },

  logo: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#126B45',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  content: {
    flex: 1,
    padding: 18,
  },

  greeting: {
    fontSize: 16,
    color: '#777',
    marginBottom: 12,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 18,
  },

  heroCard: {
    backgroundColor: '#126B45',
    borderRadius: 22,
    padding: 24,
    marginBottom: 14,
  },

  heroLabel: {
    color: '#D8F2E4',
  },

  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 7,
  },

  heroProfit: {
    color: '#D8F2E4',
    marginTop: 8,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
  },

  statLabel: {
    color: '#777',
    fontSize: 13,
  },

  statNumber: {
    fontSize: 25,
    fontWeight: '800',
    marginTop: 7,
  },

  statNumberSmall: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
  },

  sellButton: {
    backgroundColor: '#126B45',
    borderRadius: 16,
    padding: 17,
    alignItems: 'center',
  },

  sellButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },

  riskCard: {
    backgroundColor: '#E2F4E9',
    padding: 17,
    borderRadius: 17,
  },

  riskTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  riskText: {
    marginTop: 7,
    color: '#555',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#E1E5E2',
  },

  primaryButton: {
    backgroundColor: '#126B45',
    borderRadius: 13,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  secondaryButton: {
    backgroundColor: '#E6E9E7',
    borderRadius: 13,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },

  photoButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },

  cameraIcon: {
    fontSize: 35,
    marginBottom: 8,
  },

  selectedImage: {
    width: '100%',
    height: '100%',
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  productImage: {
    width: 78,
    height: 78,
    borderRadius: 14,
  },

  imagePlaceholder: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: '#EAF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 27,
  },

  productInfo: {
    flex: 1,
    marginLeft: 13,
  },

  productTitle: {
    fontSize: 17,
    fontWeight: '800',
  },

  category: {
    color: '#777',
    marginBottom: 5,
  },

  warning: {
    marginTop: 5,
    fontWeight: '800',
  },

  deleteSmall: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0F1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  sellProduct: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 10,
    marginBottom: 12,
  },

  sellImage: {
    width: '100%',
    height: 120,
    borderRadius: 13,
    marginBottom: 8,
  },

  sellPlaceholder: {
    height: 120,
    borderRadius: 13,
    backgroundColor: '#EAF0EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  sellProductName: {
    fontWeight: '800',
  },

  sellPrice: {
    fontWeight: '800',
    marginTop: 4,
  },

  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    marginBottom: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#E7ECE9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 20,
    marginTop: 12,
    marginBottom: 25,
  },

  totalLabel: {
    color: '#777',
  },

  totalAmount: {
    fontSize: 27,
    fontWeight: '800',
    marginVertical: 7,
  },

  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
  },

  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
  },

  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 20,
    marginBottom: 12,
  },

  reportNumber: {
    fontSize: 23,
    fontWeight: '800',
    marginTop: 8,
  },

  riskBigCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 15,
  },

  riskBigTitle: {
    fontSize: 25,
    fontWeight: '800',
  },

  warningCard: {
    backgroundColor: '#FFF0D8',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
  },

  marketingHero: {
    backgroundColor: '#126B45',
    borderRadius: 20,
    padding: 22,
    marginBottom: 15,
  },

  marketingTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  marketingText: {
    color: '#D8F2E4',
    marginTop: 7,
  },

  marketingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
  },

  marketingImage: {
    width: 90,
    height: 90,
    borderRadius: 13,
    marginRight: 12,
  },

  marketingPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 13,
    backgroundColor: '#EAF0EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  caption: {
    color: '#666',
    marginTop: 7,
    lineHeight: 18,
  },

  shareButton: {
    backgroundColor: '#126B45',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 9,
  },

  shareText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  nav: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E7E5',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  navButton: {
    alignItems: 'center',
    minWidth: 55,
  },

  navIcon: {
    fontSize: 19,
    color: '#777',
  },

  navLabel: {
    fontSize: 11,
    color: '#777',
    marginTop: 3,
  },

  navActive: {
    color: '#126B45',
    fontWeight: '800',
  },

  moreOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 72,
    backgroundColor: '#F5F7F6',
  },

  morePanel: {
    flex: 1,
    padding: 20,
  },

  moreButton: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 15,
    marginBottom: 10,
  },
});
