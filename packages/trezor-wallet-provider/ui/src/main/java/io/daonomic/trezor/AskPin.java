package io.daonomic.trezor;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionListener;
import java.util.function.Consumer;

public class AskPin {
    private static final int[][] values = new int[][]{
        new int[]{7, 8, 9},
        new int[]{4, 5, 6},
        new int[]{1, 2, 3}
    };

    private static void createWindow() {
        JFrame frame = new JFrame("PIN");
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        frame.getContentPane().setLayout(new GridBagLayout());
        JPasswordField pin = new JPasswordField(10);
        frame.getContentPane().add(pin, constraints(0, 0, 1, 3));
        for (int i = 0; i < values.length; i++) {
            for (int j = 0; j < values[i].length; j++) {
                int value = values[i][j];
                frame.getContentPane().add(size(listen(new JButton("\u23FA"), e -> pin.setText(new String(pin.getPassword()) + value)), 100, 100), constraints(1 + i, j));
            }
        }
        frame.getContentPane().add(size(listen(new JButton("Submit"), e -> {
            System.out.println(new String(pin.getPassword()));
            System.exit(0);
        }), 50, 50), constraints(4, 0, 1, 3));
        frame.setLocationRelativeTo(null);
        frame.pack();
        frame.setVisible(true);
    }

    private static <T extends AbstractButton> T listen(T component, ActionListener listener) {
        return with(component, b -> b.addActionListener(listener));
    }

    private static <T extends JComponent> T with(T component, Consumer<T> todo) {
        todo.accept(component);
        return component;
    }

    private static <T extends JComponent> T size(T component, int width, int height) {
        return with(component, c -> c.setPreferredSize(new Dimension(width, height)));
    }

    private static GridBagConstraints constraints(int y, int x) {
        return constraints(y, x, 1, 1);
    }

    private static GridBagConstraints constraints(int y, int x, int height, int width) {
        GridBagConstraints result = new GridBagConstraints();
        result.gridx = x;
        result.gridy = y;
        result.gridwidth = width;
        result.gridheight = height;
        result.fill = GridBagConstraints.HORIZONTAL;
        result.insets = new Insets(5, 5, 5, 5);
        return result;
    }

    public static void main(String[] args) {
        createWindow();
    }
}
